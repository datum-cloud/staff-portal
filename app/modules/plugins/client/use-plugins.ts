/**
 * React Query hook for the plugin list — CLIENT-SAFE. Ported from
 * cloud-portal's `use-project-plugins.ts`, simplified: v1 has exactly one
 * plugin with no per-org/per-project visibility rules, so `GET /api/plugins`
 * returns the full sanitized list unconditionally and this hook doesn't scope
 * by project/org. Re-add scoping if/when a second plugin needs it.
 */
import type { PublicPlugin } from '@/modules/plugins/types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export const PLUGINS_API_PATH = '/api/plugins';

export const pluginKeys = {
  all: ['plugins'] as const,
  list: () => ['plugins', 'list'] as const,
};

/**
 * Normalize the read API response into `PublicPlugin[]`. Tolerates a bare array
 * or a `{ data }` / `{ plugins }` envelope so the hook is resilient to the
 * server's exact wrapper.
 */
function normalizePluginList(body: unknown): PublicPlugin[] {
  if (Array.isArray(body)) return body as PublicPlugin[];
  if (body && typeof body === 'object') {
    const record = body as { data?: unknown; plugins?: unknown };
    if (Array.isArray(record.data)) return record.data as PublicPlugin[];
    if (Array.isArray(record.plugins)) return record.plugins as PublicPlugin[];
  }
  return [];
}

async function fetchPlugins(): Promise<PublicPlugin[]> {
  const response = await fetch(PLUGINS_API_PATH, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`Failed to load plugins (${response.status})`);
  }
  return normalizePluginList(await response.json());
}

/**
 * Fetch the available plugins. Plugin discovery is best-effort for the
 * sidebar: a failed fetch resolves to no plugin nav rather than blocking the
 * shell, so callers can treat `data ?? []` as safe.
 */
export function usePlugins(options?: { enabled?: boolean }): UseQueryResult<PublicPlugin[]> {
  return useQuery({
    queryKey: pluginKeys.list(),
    queryFn: fetchPlugins,
    enabled: options?.enabled !== false,
    staleTime: 60_000,
    retry: false,
  });
}
