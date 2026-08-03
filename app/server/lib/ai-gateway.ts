import { env } from '@/utils/config/env.server';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { readFileSync } from 'node:fs';

const MODELS_CACHE_TTL_MS = 10 * 60 * 1000;

/** Which gateway wire protocol to use for a given model id. */
export type GatewayProtocol = 'anthropic' | 'openai';

export type GatewayModelOption = {
  id: string;
  label: string;
  protocol: GatewayProtocol;
};

let modelsCache: { models: GatewayModelOption[]; expiresAt: number } | null = null;

/** Read the gateway JWT from env (local) or projected SA token file (in-cluster). */
export function getAiGatewayToken(): string | undefined {
  if (env.aiGatewayToken?.trim()) return env.aiGatewayToken.trim();
  if (!env.aiGatewayTokenFile) return undefined;
  try {
    return readFileSync(env.aiGatewayTokenFile, 'utf8').trim() || undefined;
  } catch {
    return undefined;
  }
}

export function isAiGatewayConfigured(): boolean {
  return Boolean(env.aiGatewayUrl && getAiGatewayToken());
}

function requireGatewayAuth(): { token: string; baseUrl: string } {
  const token = getAiGatewayToken();
  const baseUrl = env.aiGatewayUrl?.replace(/\/$/, '');
  if (!token || !baseUrl) {
    throw new Error('AI gateway is not configured');
  }
  return { token, baseUrl };
}

/** OpenAI-compatible client → POST /v1/chat/completions */
export function createOpenAiGatewayProvider() {
  const { token, baseUrl } = requireGatewayAuth();
  return createOpenAICompatible({
    name: 'datum-ai-gateway',
    baseURL: `${baseUrl}/v1`,
    apiKey: token,
    includeUsage: true,
  });
}

/** Anthropic Messages client → POST /anthropic/v1/messages */
export function createAnthropicGatewayProvider() {
  const { token, baseUrl } = requireGatewayAuth();
  return createAnthropic({
    baseURL: `${baseUrl}/anthropic/v1`,
    authToken: token,
  });
}

export function createGatewayLanguageModel(
  modelId: string,
  protocol: GatewayProtocol
): LanguageModel {
  if (protocol === 'anthropic') {
    return createAnthropicGatewayProvider()(modelId);
  }
  return createOpenAiGatewayProvider().chatModel(modelId);
}

/** Strip gateway failover prefix so labels read as "Claude Sonnet 5", not "Openai Claude…". */
function humanizeModelId(id: string): string {
  return id
    .replace(/^openai-/, '')
    .replace(/^claude-/, 'Claude ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Native Anthropic id covered by an `openai-claude-*` failover alias (or the same id on /v1). */
function coveredAnthropicId(openaiId: string): string | undefined {
  if (openaiId.startsWith('openai-claude-')) return openaiId.slice('openai-'.length);
  if (openaiId.startsWith('claude-')) return openaiId;
  return undefined;
}

/**
 * Map a client/env model id onto the catalog, preferring failover aliases.
 * `claude-sonnet-5` → `openai-claude-sonnet-5` when the latter exists.
 */
function resolveCatalogModel(
  requested: string | undefined,
  byId: Map<string, GatewayModelOption>
): GatewayModelOption | undefined {
  if (!requested) return undefined;
  const direct = byId.get(requested);
  if (direct) return direct;

  if (requested.startsWith('claude-')) {
    const failover = byId.get(`openai-${requested}`);
    if (failover) return failover;
  }

  if (requested.startsWith('openai-claude-')) {
    const native = byId.get(requested.slice('openai-'.length));
    if (native) return native;
  }

  return undefined;
}

function normalizeModels(
  data: Array<{ id?: string; name?: string; display_name?: string }> | undefined
): Array<{ id: string; label: string }> {
  return (data ?? [])
    .filter((m): m is { id: string; name?: string; display_name?: string } =>
      Boolean(typeof m.id === 'string' && m.id.length > 0)
    )
    .map((m) => ({
      id: m.id,
      label:
        (typeof m.display_name === 'string' && m.display_name) ||
        (typeof m.name === 'string' && m.name) ||
        humanizeModelId(m.id),
    }));
}

async function fetchModelsJson(
  path: string,
  token: string,
  baseUrl: string
): Promise<Array<{ id: string; label: string }>> {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`AI gateway ${path} failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    data?: Array<{ id?: string; name?: string; display_name?: string }>;
  };
  return normalizeModels(json.data);
}

/**
 * Merge OpenAI-compatible + Anthropic discovery catalogs.
 *
 * Prefer `/v1` failover aliases (`openai-claude-*`) over native Anthropic
 * `claude-*` ids — those aliases retry onto Qwen when Anthropic is unhealthy.
 * Anthropic-only models (no failover alias) stay on the Messages protocol.
 */
export async function fetchGatewayModels(options?: {
  force?: boolean;
}): Promise<GatewayModelOption[]> {
  const now = Date.now();
  if (!options?.force && modelsCache && modelsCache.expiresAt > now) {
    return modelsCache.models;
  }

  const { token, baseUrl } = requireGatewayAuth();

  const [openaiResult, anthropicResult] = await Promise.allSettled([
    fetchModelsJson('/v1/models', token, baseUrl),
    fetchModelsJson('/anthropic/v1/models', token, baseUrl),
  ]);

  const openaiModels = openaiResult.status === 'fulfilled' ? openaiResult.value : [];
  const anthropicModels = anthropicResult.status === 'fulfilled' ? anthropicResult.value : [];

  if (openaiModels.length === 0 && anthropicModels.length === 0) {
    const errors = [openaiResult, anthropicResult]
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
    throw new Error(
      errors.length > 0
        ? `AI gateway models unavailable: ${errors.join('; ')}`
        : 'AI gateway returned no models'
    );
  }

  const anthropicById = new Map(anthropicModels.map((m) => [m.id, m]));
  const merged: GatewayModelOption[] = [];
  const seen = new Set<string>();
  const coveredAnthropic = new Set<string>();

  // OpenAI catalog first — includes failover-capable Claude aliases.
  for (const m of openaiModels) {
    const nativeId = coveredAnthropicId(m.id);
    if (nativeId) coveredAnthropic.add(nativeId);

    const anthropicLabel = nativeId ? anthropicById.get(nativeId)?.label : undefined;
    merged.push({
      id: m.id,
      label: anthropicLabel || m.label || humanizeModelId(m.id),
      protocol: 'openai',
    });
    seen.add(m.id);
  }

  // Anthropic-only models that have no openai-claude-* (or same-id) failover twin.
  for (const m of anthropicModels) {
    if (coveredAnthropic.has(m.id) || seen.has(m.id)) continue;
    merged.push({
      id: m.id,
      label: m.label || humanizeModelId(m.id),
      protocol: 'anthropic',
    });
    seen.add(m.id);
  }

  modelsCache = { models: merged, expiresAt: now + MODELS_CACHE_TTL_MS };
  return merged;
}

/** Honor a client-requested model only if it appears in the merged gateway catalog. */
export async function resolveGatewayModel(requested?: string): Promise<GatewayModelOption> {
  let models = await fetchGatewayModels();
  let byId = new Map(models.map((m) => [m.id, m]));

  let match = resolveCatalogModel(requested, byId);
  if (requested && !match) {
    models = await fetchGatewayModels({ force: true });
    byId = new Map(models.map((m) => [m.id, m]));
    match = resolveCatalogModel(requested, byId);
  }

  if (match) return match;

  const preferred = resolveCatalogModel(env.aiGatewayModel, byId);
  if (preferred) return preferred;

  if (models[0]) return models[0];
  throw new Error('No models available from AI gateway');
}
