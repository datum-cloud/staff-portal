import { callMcpTool } from './mcp-client';
import { tool } from 'ai';
import { z } from 'zod';

export function createClusterTools() {
  return {
    getFluxStatus: tool({
      description:
        'Get the Flux GitOps installation status for the cluster.' +
        ' Call this to check if Flux is healthy and what version is running.',
      inputSchema: z.object({}),
      execute: async () => {
        return callMcpTool('flux-mcp-server__get_flux_instance', {});
      },
    }),

    getClusterResources: tool({
      description:
        'List Kubernetes resources by kind and apiVersion.' +
        ' Use this to inspect pods, deployments, services, or any k8s resource in the cluster.' +
        ' Always provide a namespace when possible to avoid huge responses.',
      inputSchema: z.object({
        apiVersion: z
          .string()
          .describe(
            'The Kubernetes API version (e.g. "v1", "apps/v1", "helm.toolkit.fluxcd.io/v2")'
          ),
        kind: z
          .string()
          .describe(
            'The Kubernetes resource kind (e.g. "Pod", "Deployment", "Service", "HelmRelease")'
          ),
        namespace: z
          .string()
          .optional()
          .describe('Namespace to filter by (strongly recommended to avoid huge responses)'),
        name: z.string().optional().describe('Filter by exact resource name'),
        selector: z
          .string()
          .optional()
          .describe('Label selector to filter resources (e.g. "app=cloud-portal")'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(50)
          .describe('Max resources to return (default: 50)'),
      }),
      execute: async ({
        apiVersion,
        kind,
        namespace,
        name,
        selector,
        limit,
      }: {
        apiVersion: string;
        kind: string;
        namespace?: string;
        name?: string;
        selector?: string;
        limit: number;
      }) => {
        const args: Record<string, unknown> = { apiVersion, kind, limit };
        if (namespace) args.namespace = namespace;
        if (name) args.name = name;
        if (selector) args.selector = selector;
        return callMcpTool('flux-mcp-server__get_kubernetes_resources', args);
      },
    }),

    getPodLogs: tool({
      description:
        'Get container logs from a pod in the cluster.' +
        ' Use this to investigate pod issues or check application output.',
      inputSchema: z.object({
        pod_name: z.string().describe('Pod name'),
        pod_namespace: z.string().describe('Pod namespace'),
        container_name: z.string().describe('Container name'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(500)
          .default(100)
          .describe('Max log lines to return (default: 100)'),
      }),
      execute: async ({
        pod_name,
        pod_namespace,
        container_name,
        limit,
      }: {
        pod_name: string;
        pod_namespace: string;
        container_name: string;
        limit: number;
      }) => {
        return callMcpTool('flux-mcp-server__get_kubernetes_logs', {
          pod_name,
          pod_namespace,
          container_name,
          limit,
        });
      },
    }),

    getPodMetrics: tool({
      description:
        'Get CPU and memory metrics for pods in a namespace.' +
        ' Use this to check resource consumption.',
      inputSchema: z.object({
        pod_namespace: z.string().describe('Namespace to get pod metrics from'),
        pod_name: z.string().optional().describe('Filter by specific pod name'),
        pod_selector: z
          .string()
          .optional()
          .describe('Pod label selector (e.g. "app=cloud-portal")'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(50)
          .describe('Max pods to return metrics for (default: 50)'),
      }),
      execute: async ({
        pod_namespace,
        pod_name,
        pod_selector,
        limit,
      }: {
        pod_namespace: string;
        pod_name?: string;
        pod_selector?: string;
        limit: number;
      }) => {
        const args: Record<string, unknown> = { pod_namespace, limit };
        if (pod_name) args.pod_name = pod_name;
        if (pod_selector) args.pod_selector = pod_selector;
        return callMcpTool('flux-mcp-server__get_kubernetes_metrics', args);
      },
    }),

    queryClusterMetrics: tool({
      description:
        'Run a MetricsQL query against VictoriaMetrics in the cluster.' +
        ' Use this for ad-hoc metric queries on cluster-level metrics.',
      inputSchema: z.object({
        query: z.string().describe('The MetricsQL/PromQL query to execute'),
        step: z
          .string()
          .optional()
          .describe('Interval for searching raw samples (e.g. "1m", "5m")'),
      }),
      execute: async ({ query, step }: { query: string; step?: string }) => {
        const args: Record<string, unknown> = { query };
        if (step) args.step = step;
        return callMcpTool('victoria-metrics-mcp-server__query', args);
      },
    }),

    queryClusterMetricsRange: tool({
      description:
        'Run a MetricsQL range query against VictoriaMetrics in the cluster.' +
        ' Use this for time-series data from the cluster.',
      inputSchema: z.object({
        query: z.string().describe('The MetricsQL/PromQL query'),
        start: z.string().describe('Start time (RFC3339 or unix timestamp in ms)'),
        end: z
          .string()
          .optional()
          .describe('End time (RFC3339 or unix timestamp, defaults to now)'),
        step: z.string().optional().describe('Step interval (e.g. "60s", "5m", defaults to 5m)'),
      }),
      execute: async ({
        query,
        start,
        end,
        step,
      }: {
        query: string;
        start: string;
        end?: string;
        step?: string;
      }) => {
        const args: Record<string, unknown> = { query, start };
        if (end) args.end = end;
        if (step) args.step = step;
        return callMcpTool('victoria-metrics-mcp-server__query_range', args);
      },
    }),

    getClusterAlerts: tool({
      description:
        'List active alerts from VictoriaMetrics in the cluster.' +
        ' Call this when the operator asks about firing alerts or cluster health.',
      inputSchema: z.object({
        state: z
          .enum(['firing', 'pending', 'all'])
          .default('firing')
          .describe('Filter by alert state (default: firing)'),
        limit: z
          .number()
          .int()
          .min(0)
          .default(50)
          .describe('Max alerts to return (default: 50, 0 for all)'),
      }),
      execute: async ({ state, limit }: { state: string; limit: number }) => {
        return callMcpTool('victoria-metrics-mcp-server__alerts', { state, limit });
      },
    }),
  };
}
