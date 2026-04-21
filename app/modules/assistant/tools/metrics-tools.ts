import { PrometheusService } from '@/modules/prometheus';
import { tool } from 'ai';
import { z } from 'zod';

interface MetricsToolDeps {
  accessToken: string;
}

export function createMetricsTools({ accessToken }: MetricsToolDeps) {
  return {
    queryPrometheus: tool({
      description:
        'Run a PromQL instant query against the platform Prometheus.' +
        ' Use this to check metrics like request rates, error rates, latency, or resource usage.' +
        ' Returns raw metric results (labels + values), capped at 50 series.',
      inputSchema: z.object({
        query: z.string().describe('The PromQL instant query to execute'),
        description: z
          .string()
          .describe('A brief explanation of what this query measures (for audit logging)'),
      }),
      execute: async ({ query }: { query: string; description: string }) => {
        try {
          const service = new PrometheusService(accessToken);
          const result = await service.queryInstant(query);
          const series = result?.data?.result ?? [];
          return {
            resultType: result?.data?.resultType,
            results: series.slice(0, 50).map((s: any) => ({
              metric: s.metric,
              value: s.value,
            })),
            truncated: series.length > 50,
          };
        } catch (err) {
          return {
            error: `Prometheus query failed: ${err instanceof Error ? err.message : 'unknown'}`,
          };
        }
      },
    }),

    queryPrometheusRange: tool({
      description:
        'Run a PromQL range query for time-series data.' +
        ' Use this when the operator asks for metrics over a time period.',
      inputSchema: z.object({
        query: z.string().describe('The PromQL range query to execute'),
        hoursBack: z
          .number()
          .int()
          .min(1)
          .max(168)
          .default(24)
          .describe('How many hours back to query (default 24)'),
        stepMinutes: z
          .number()
          .int()
          .min(1)
          .max(60)
          .default(5)
          .describe('Step interval in minutes (default 5)'),
      }),
      execute: async ({
        query,
        hoursBack,
        stepMinutes,
      }: {
        query: string;
        hoursBack: number;
        stepMinutes: number;
      }) => {
        try {
          const service = new PrometheusService(accessToken);
          const end = new Date();
          const start = new Date(end.getTime() - hoursBack * 60 * 60 * 1000);
          const result = await service.queryRange(query, { start, end }, `${stepMinutes}m`);
          const series = result?.data?.result ?? [];
          return {
            resultType: result?.data?.resultType,
            results: series.slice(0, 20).map((s: any) => ({
              metric: s.metric,
              values: (s.values ?? []).slice(-50),
            })),
            truncated: series.length > 20,
          };
        } catch (err) {
          return {
            error: `Prometheus range query failed: ${err instanceof Error ? err.message : 'unknown'}`,
          };
        }
      },
    }),
  };
}
