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

function humanizeModelId(id: string): string {
  return id
    .replace(/^claude-/, 'Claude ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
 * - Models listed on `/v1/models` use the OpenAI protocol (even if also on Anthropic).
 * - Models only on `/anthropic/v1/models` use the Anthropic Messages protocol.
 * - Anthropic-only entries are listed first so Claude models appear ahead of Qwen.
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

  const openaiIds = new Set(openaiModels.map((m) => m.id));
  const openaiById = new Map(openaiModels.map((m) => [m.id, m]));
  const merged: GatewayModelOption[] = [];
  const seen = new Set<string>();

  // Anthropic discovery first (Claude catalog), but route via OpenAI if /v1 lists them.
  for (const m of anthropicModels) {
    const protocol: GatewayProtocol = openaiIds.has(m.id) ? 'openai' : 'anthropic';
    const openaiLabel = openaiById.get(m.id)?.label;
    merged.push({
      id: m.id,
      // Prefer curated Anthropic display_name when present.
      label: m.label || openaiLabel || humanizeModelId(m.id),
      protocol,
    });
    seen.add(m.id);
  }

  for (const m of openaiModels) {
    if (seen.has(m.id)) continue;
    merged.push({ id: m.id, label: m.label, protocol: 'openai' });
  }

  modelsCache = { models: merged, expiresAt: now + MODELS_CACHE_TTL_MS };
  return merged;
}

/** Honor a client-requested model only if it appears in the merged gateway catalog. */
export async function resolveGatewayModel(requested?: string): Promise<GatewayModelOption> {
  let models = await fetchGatewayModels();
  const byId = new Map(models.map((m) => [m.id, m]));

  if (requested && !byId.has(requested)) {
    models = await fetchGatewayModels({ force: true });
    byId.clear();
    for (const m of models) byId.set(m.id, m);
  }

  if (requested) {
    const match = byId.get(requested);
    if (match) return match;
  }
  if (env.aiGatewayModel) {
    const preferred = byId.get(env.aiGatewayModel);
    if (preferred) return preferred;
  }
  if (models[0]) return models[0];
  throw new Error('No models available from AI gateway');
}
