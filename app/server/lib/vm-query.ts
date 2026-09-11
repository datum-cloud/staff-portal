import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

export interface PromMatrixSeries {
  metric: Record<string, string>;
  values: [number, string][];
}

export interface PromVectorSample {
  metric: Record<string, string>;
  value: [number, string];
}

// victoria-metrics-mcp-server__{query,query_range} return the raw VM JSON
// response wrapped in an MCP content block. Callers must use client.callTool
// directly (never the callMcpTool() helper in
// app/modules/assistant/tools/mcp-client.ts, which hard-truncates any text
// content over 30,000 characters and would silently corrupt a wide result).
function unwrapMcpResult(result: unknown): any[] {
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

export async function runVmInstantQuery(
  client: Client,
  query: string,
  opts: { time?: number } = {}
): Promise<PromVectorSample[]> {
  const result = await client.callTool({
    name: 'victoria-metrics-mcp-server__query',
    arguments: {
      query,
      ...(opts.time !== undefined ? { time: String(opts.time) } : {}),
    },
  });
  return unwrapMcpResult(result);
}

export async function runVmRangeQuery(
  client: Client,
  query: string,
  opts: { start: string; end: string; step: string }
): Promise<PromMatrixSeries[]> {
  const result = await client.callTool({
    name: 'victoria-metrics-mcp-server__query_range',
    arguments: { query, ...opts },
  });
  return unwrapMcpResult(result);
}

// Stable join key for matching a series across two queries by label set,
// deliberately excluding __name__ — rollup functions vary on whether they
// keep it (timestamp_with_name does, last_over_time doesn't), so two
// queries over the same series would otherwise fail to join.
export function seriesKey(metric: Record<string, string>): string {
  return Object.entries(metric)
    .filter(([k]) => k !== '__name__')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
}
