import { EnvVariables } from '@/server/iface';
import { logApiError, logApiSuccess } from '@/server/logger';
import { authMiddleware } from '@/server/middleware';
import { createErrorResponse, createSuccessResponse } from '@/server/response';
import { captureApiError, createRequestLogger } from '@/utils/logger';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Hono } from 'hono';

export const chainsawTestsRoutes = new Hono<{ Variables: EnvVariables }>();

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const STEP = '1h';
const GITHUB_ACTIONS_URL =
  'https://github.com/datum-cloud/infra/actions/workflows/run-e2e-tests.yaml';

interface ChainsawTestRun {
  timestamp: number;
  passed: boolean;
}

interface ChainsawTestRow {
  key: string;
  test: string;
  suite: string;
  environment: string;
  history: ChainsawTestRun[];
  latest: ChainsawTestRun | null;
  grafanaUrl: string;
  docsUrl: string;
}

function grafanaHost(environment: string): string {
  return environment === 'staging' ? 'grafana.staging.env.datum.net' : 'grafana.prod.env.datum.net';
}

function grafanaUrlFor(suite: string, test: string, environment: string): string {
  const host = grafanaHost(environment);
  return `https://${host}/d/chainsaw-e2e/chainsaw-e2e-tests?var-suite=${encodeURIComponent(suite)}&var-test=${encodeURIComponent(test)}`;
}

// Every construct test's README.md lives at this path by convention
// (see datum-cloud/infra's tests/README.md anatomy section) — the
// "Validates" / "Stability" / "Skips" writeup for that specific test.
function docsUrlFor(suite: string, test: string): string {
  return `https://github.com/datum-cloud/infra/blob/main/tests/construct/${encodeURIComponent(suite)}/${encodeURIComponent(test)}/README.md`;
}

// victoria-metrics-mcp-server__query_range returns the raw VM JSON response
// wrapped in an MCP content block; unwrap it the same way runVmQuery does in
// server/routes/cluster.ts, but for a matrix (range) result: entries carry
// `values` (a [timestamp, value] tuple array), not a single `value`.
async function runVmRangeQuery(client: Client, query: string): Promise<any[]> {
  const result = await client.callTool({
    name: 'victoria-metrics-mcp-server__query_range',
    arguments: {
      query,
      start: new Date(Date.now() - THREE_DAYS_MS).toISOString(),
      end: new Date().toISOString(),
      step: STEP,
    },
  });

  if ((result as any)?.isError) {
    throw new Error((result as any)?.content?.[0]?.text ?? 'VictoriaMetrics range query failed');
  }

  const textContent = (result as any)?.content?.find((c: any) => c.type === 'text');
  try {
    const parsed = JSON.parse(textContent?.text ?? '{}');
    return parsed?.data?.result ?? [];
  } catch {
    return [];
  }
}

chainsawTestsRoutes.post('/', authMiddleware(), async (c) => {
  const startTime = performance.now();
  const reqLogger = createRequestLogger(c);
  const reqId = c.get('requestId');

  reqLogger.info('Chainsaw Tests API Request Started', {
    path: c.req.path,
    method: c.req.method,
  });

  try {
    const { getMcpClient } = await import('@/modules/assistant/tools/mcp-client');

    const client = await getMcpClient();
    if (!client) {
      throw new Error('MCP is not configured or unreachable');
    }

    // Only tests someone has explicitly vouched for as "expected to pass
    // every run" — an unlabeled test is excluded, not defaulted in. See
    // metadata.labels.stability on each tests/construct/**/chainsaw-test.yaml.
    const results = await runVmRangeQuery(client, 'chainsaw_test_result{stability="stable"}');

    const tests: ChainsawTestRow[] = results
      .map((series: any) => {
        const labels = series.metric ?? {};
        const test = labels.test ?? 'unknown';
        const suite = labels.suite ?? 'unknown';
        const environment = labels.environment ?? 'unknown';
        const history: ChainsawTestRun[] = (series.values ?? [])
          .map(([ts, value]: [number, string]) => ({
            timestamp: ts * 1000,
            passed: parseFloat(value) === 1,
          }))
          .sort((a: ChainsawTestRun, b: ChainsawTestRun) => a.timestamp - b.timestamp);

        return {
          key: `${suite}/${test}/${environment}`,
          test,
          suite,
          environment,
          history,
          latest: history.length > 0 ? history[history.length - 1] : null,
          grafanaUrl: grafanaUrlFor(suite, test, environment),
          docsUrl: docsUrlFor(suite, test),
        };
      })
      .sort((a, b) => a.test.localeCompare(b.test));

    const data = { tests, githubActionsUrl: GITHUB_ACTIONS_URL };

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

    const { response, status } = await createErrorResponse(reqId, error, '/chainsaw-tests');
    return c.json(response, status as any);
  }
});
