import { EnvVariables } from '@/server/iface';
import { logApiError, logApiSuccess } from '@/server/logger';
import { authMiddleware } from '@/server/middleware';
import { createErrorResponse, createSuccessResponse } from '@/server/response';
import { env } from '@/utils/config/env.server';
import { captureApiError, createRequestLogger } from '@/utils/logger';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Hono } from 'hono';

export const clusterRoutes = new Hono<{ Variables: EnvVariables }>();

const CLUSTER_FILTERS = {
  production: 'cluster!="", cluster!~".*lab.*|.*control-plane.*"',
  staging: 'cluster!="", cluster!~".*lab.*"',
} as const;

const REGION_NAMES: Record<string, string> = {
  'ae-north-1': 'UAE North',
  'au-east-1': 'Australia East',
  'br-east-1': 'Brazil East',
  'ca-east-1': 'Canada East',
  'cl-central-1': 'Chile Central',
  'de-central-1': 'Germany Central',
  'gb-south-1': 'UK South',
  'in-west-1': 'India West',
  'jp-east-1': 'Japan East',
  'nl-west-1': 'Netherlands West',
  'sg-central-1': 'Singapore Central',
  'us-central-1': 'US Central',
  'us-east-1': 'US East 1',
  'us-east-2': 'US East 2',
  'us-west-1': 'US West',
  'za-central-1': 'South Africa Central',
};

function regionFromClusterName(name: string): string | undefined {
  const match = name.match(/^([a-z]{2}-[a-z]+-\d+)/);
  if (!match) return undefined;
  return REGION_NAMES[match[1]];
}

function buildHealthQueries(f: string) {
  return {
    nodeReady: `min by (cluster) (kube_node_status_condition{condition="Ready", status="true", ${f}})`,
    gateway: `min by (cluster) (gatewayapi_gateway_status{${f}, type=~"Accepted|Programmed"})`,
    memoryPressure: `max by (cluster) (kube_node_status_condition{condition="MemoryPressure", status="true", ${f}} == 1)`,
    diskPressure: `max by (cluster) (kube_node_status_condition{condition="DiskPressure", status="true", ${f}} == 1)`,
    pidPressure: `max by (cluster) (kube_node_status_condition{condition="PIDPressure", status="true", ${f}} == 1)`,
    requestRate: `sum by (cluster) (rate(envoy_cluster_upstream_rq_total{${f}}[5m]))`,
    certExpiryDays: `min by (cluster) ((certmanager_certificate_expiration_timestamp_seconds{${f}} - time()) / 86400 > 0)`,
    restartingContainers: `count by (cluster) (kube_pod_container_status_restarts_total{${f}} > 5)`,
  };
}

async function runVmQuery(client: Client, query: string): Promise<any[]> {
  const result = await client.callTool({
    name: 'victoria-metrics-mcp-server__query',
    arguments: { query },
  });

  if ((result as any)?.isError) {
    throw new Error((result as any)?.content?.[0]?.text ?? 'VictoriaMetrics query failed');
  }

  const textContent = (result as any)?.content?.find((c: any) => c.type === 'text');
  try {
    const parsed = JSON.parse(textContent?.text ?? '{}');
    return parsed?.data?.result ?? [];
  } catch {
    return [];
  }
}

clusterRoutes.post('/health', authMiddleware(), async (c) => {
  const startTime = performance.now();
  const reqLogger = createRequestLogger(c);
  const reqId = c.get('requestId');

  reqLogger.info('Cluster Health API Request Started', {
    path: c.req.path,
    method: c.req.method,
  });

  try {
    const isProduction = env.SENTRY_ENV === 'production';
    const filter = isProduction ? CLUSTER_FILTERS.production : CLUSTER_FILTERS.staging;
    const queries = buildHealthQueries(filter);

    const { getMcpClient } = await import('@/modules/assistant/tools/mcp-client');

    const client = await getMcpClient();
    if (!client) {
      throw new Error('MCP is not configured or unreachable');
    }

    const [
      nodeReadyResults,
      gatewayResults,
      memoryResults,
      diskResults,
      pidResults,
      requestRateResults,
      certExpiryResults,
      restartResults,
    ] = await Promise.all([
      runVmQuery(client, queries.nodeReady),
      runVmQuery(client, queries.gateway),
      runVmQuery(client, queries.memoryPressure),
      runVmQuery(client, queries.diskPressure),
      runVmQuery(client, queries.pidPressure),
      runVmQuery(client, queries.requestRate),
      runVmQuery(client, queries.certExpiryDays),
      runVmQuery(client, queries.restartingContainers),
    ]);

    const valueLookup = (results: any[]) => {
      const map = new Map<string, number>();
      for (const r of results) {
        const cluster = r.metric?.cluster;
        if (cluster) map.set(cluster, parseFloat(r.value?.[1] ?? '0'));
      }
      return map;
    };

    const pressureLookup = (results: any[]) => {
      const set = new Set<string>();
      for (const r of results) {
        const cluster = r.metric?.cluster;
        if (cluster && parseFloat(r.value?.[1] ?? '0') === 1) {
          set.add(cluster);
        }
      }
      return set;
    };

    const nodeReadyMap = valueLookup(nodeReadyResults);
    const gatewayMap = valueLookup(gatewayResults);
    const memPressure = pressureLookup(memoryResults);
    const dskPressure = pressureLookup(diskResults);
    const pidPress = pressureLookup(pidResults);
    const requestRateMap = valueLookup(requestRateResults);
    const certExpiryMap = valueLookup(certExpiryResults);
    const restartMap = valueLookup(restartResults);

    const allClusterNames = new Set([...nodeReadyMap.keys(), ...gatewayMap.keys()]);

    const clusters = Array.from(allClusterNames)
      .map((name) => {
        const nodesReady = nodeReadyMap.get(name) === 1;
        const gatewayHealthy = gatewayMap.has(name) ? gatewayMap.get(name) === 1 : null;
        return {
          name,
          region: regionFromClusterName(name),
          nodesReady,
          gatewayHealthy,
          memoryPressure: memPressure.has(name),
          diskPressure: dskPressure.has(name),
          pidPressure: pidPress.has(name),
          requestRate: requestRateMap.has(name)
            ? Math.round(requestRateMap.get(name)! * 100) / 100
            : null,
          certExpiryDays: certExpiryMap.has(name) ? Math.round(certExpiryMap.get(name)!) : null,
          restartingContainers: restartMap.get(name) ?? 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const healthy = clusters.filter(
      (cl) =>
        cl.nodesReady &&
        cl.gatewayHealthy !== false &&
        !cl.memoryPressure &&
        !cl.diskPressure &&
        !cl.pidPressure
    ).length;

    const data = {
      clusters,
      summary: {
        total: clusters.length,
        healthy,
        unhealthy: clusters.length - healthy,
      },
    };

    const duration = Math.round(performance.now() - startTime);

    logApiSuccess(reqLogger, {
      path: c.req.path,
      method: c.req.method,
      duration,
    });

    return c.json(createSuccessResponse(reqId, data, c.req.path), 200, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);

    await logApiError(reqLogger, error, {
      path: c.req.path,
      method: c.req.method,
      duration,
    });

    if (error instanceof Error) {
      captureApiError(error, {
        url: c.req.path,
        method: c.req.method,
        requestId: reqId,
      });
    }

    const { response, status } = await createErrorResponse(reqId, error, '/cluster/health');
    return c.json(response, status as any);
  }
});
