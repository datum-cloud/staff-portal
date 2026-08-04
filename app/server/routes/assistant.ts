import { buildSystemPrompt, createAssistantTools } from '@/modules/assistant';
import { EnvVariables } from '@/server/iface';
import {
  createGatewayLanguageModel,
  fetchGatewayModels,
  isAiGatewayConfigured,
  isAssistantConfigured,
  resolveGatewayModel,
} from '@/server/lib/ai-gateway';
import { authMiddleware, getToken, getUserId } from '@/server/middleware';
import { env } from '@/utils/config/env.server';
import { logger } from '@/utils/logger';
import { createAnthropic } from '@ai-sdk/anthropic';
import {
  APICallError,
  convertToModelMessages,
  smoothStream,
  stepCountIs,
  streamText,
  type UIMessage,
} from 'ai';
import { Hono } from 'hono';

export const assistantRoutes = new Hono<{ Variables: EnvVariables }>();

const MAX_MESSAGES = 50;

/**
 * Direct Anthropic allowlist (prod / local without gateway). Keep labels in
 * sync with what GET /models returns on the Anthropic path.
 */
const DIRECT_ANTHROPIC_MODELS: Array<{ id: string; label: string }> = [
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5' },
];
const ALLOWED_DIRECT_MODELS = new Set(DIRECT_ANTHROPIC_MODELS.map((m) => m.id));
const DEFAULT_DIRECT_MODEL = DIRECT_ANTHROPIC_MODELS[0].id;

/** Effort → Anthropic extended-thinking token budget (Claude 4.x `enabled` thinking). */
const EFFORT_BUDGETS = { low: 4000, medium: 10000, high: 20000 } as const;
const DEFAULT_THINKING_BUDGET = 10000;

/** Effort → portable OpenAI-compatible / Claude 5 adaptive effort. */
const EFFORT_TO_REASONING = { low: 'low', medium: 'medium', high: 'high' } as const;
const DEFAULT_REASONING_EFFORT = 'high';

function resolveEffortBudget(effort: unknown): number {
  return typeof effort === 'string' && effort in EFFORT_BUDGETS
    ? EFFORT_BUDGETS[effort as keyof typeof EFFORT_BUDGETS]
    : DEFAULT_THINKING_BUDGET;
}

function resolveReasoningEffort(effort: unknown): string {
  return typeof effort === 'string' && effort in EFFORT_TO_REASONING
    ? EFFORT_TO_REASONING[effort as keyof typeof EFFORT_TO_REASONING]
    : DEFAULT_REASONING_EFFORT;
}

/** Claude 5.x requires adaptive thinking; 4.x uses enabled + budgetTokens. */
function usesAdaptiveThinking(modelId: string): boolean {
  return /^claude-(?:opus|sonnet|haiku|fable)-5(?:-|$)/.test(modelId);
}

/** Prefer the provider's real message over the SDK's opaque default. */
function formatAssistantError(error: unknown): string {
  if (APICallError.isInstance(error)) {
    if (typeof error.responseBody === 'string' && error.responseBody.length > 0) {
      try {
        const parsed = JSON.parse(error.responseBody) as {
          error?: { message?: string };
          message?: string;
        };
        const msg = parsed.error?.message ?? parsed.message;
        if (typeof msg === 'string' && msg.trim()) return msg.trim();
      } catch {
        // fall through
      }
    }
    if (error.message.trim()) return error.message.trim();
  }

  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause) {
      const nested = formatAssistantError(cause);
      if (nested !== 'An error occurred.') return nested;
    }
    if (error.message.trim() && error.message !== 'An error occurred.') {
      return error.message.trim();
    }
  }

  return 'An error occurred.';
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function resolveDirectAnthropicModel(requested?: string): string {
  if (requested && ALLOWED_DIRECT_MODELS.has(requested)) return requested;
  if (env.anthropicModel && ALLOWED_DIRECT_MODELS.has(env.anthropicModel)) {
    return env.anthropicModel;
  }
  return DEFAULT_DIRECT_MODEL;
}

assistantRoutes.get('/models', authMiddleware(), async (c) => {
  if (!env.chatbotEnabled || !isAssistantConfigured()) {
    return c.json({ error: 'AI assistant is not configured' }, 503);
  }

  if (!isAiGatewayConfigured()) {
    return c.json({ models: [...DIRECT_ANTHROPIC_MODELS] });
  }

  try {
    const models = await fetchGatewayModels();
    // UI only needs id/label; protocol stays server-side for routing.
    return c.json({
      models: models.map(({ id, label }) => ({ id, label })),
    });
  } catch (err) {
    logger.error('assistant models fetch failed', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return c.json({ error: 'Failed to load models' }, 502);
  }
});

assistantRoutes.post('/', authMiddleware(), async (c) => {
  if (!env.chatbotEnabled || !isAssistantConfigured()) {
    return c.json({ error: 'AI assistant is not configured' }, 503);
  }

  const token = getToken(c);
  const userId = getUserId(c);

  const body = await c.req.json();
  const {
    messages,
    clientOs,
    model: requestedModel,
    effort: requestedEffort,
  } = body as {
    messages: UIMessage[];
    clientOs?: string;
    model?: string;
    effort?: string;
  };

  const lastUserMessage = messages.filter((m) => m.role === 'user').at(-1);
  const userMessage = lastUserMessage?.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join(' ')
    .slice(0, 500);

  if (!checkRateLimit(userId)) {
    return c.json({ error: 'Too Many Requests' }, 429);
  }

  try {
    if (isAiGatewayConfigured()) {
      return await streamViaGateway({
        messages,
        clientOs,
        requestedModel,
        requestedEffort,
        token,
        userId,
        userMessage,
      });
    }

    return await streamViaAnthropic({
      messages,
      clientOs,
      requestedModel,
      requestedEffort,
      token,
      userId,
      userMessage,
    });
  } catch (err) {
    const message = formatAssistantError(err);
    logger.error('assistant request failed', {
      userId,
      userMessage,
      error: message,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return c.json({ error: message }, 500);
  }
});

async function streamViaGateway(args: {
  messages: UIMessage[];
  clientOs?: string;
  requestedModel?: string;
  requestedEffort?: string;
  token: string;
  userId: string;
  userMessage?: string;
}) {
  const { messages, clientOs, requestedModel, requestedEffort, token, userId, userMessage } = args;

  const selected = await resolveGatewayModel(requestedModel);
  const languageModel = createGatewayLanguageModel(selected.id, selected.protocol);

  const thinkingBudget = resolveEffortBudget(requestedEffort);
  const reasoningEffort = resolveReasoningEffort(requestedEffort);
  const adaptive = selected.protocol === 'anthropic' && usesAdaptiveThinking(selected.id);

  const result = streamText({
    model: languageModel,
    system: buildSystemPrompt(clientOs),
    messages: await convertToModelMessages(messages.slice(-MAX_MESSAGES)),
    // Anthropic requires max_tokens > thinking budget when extended thinking is on.
    maxOutputTokens: selected.protocol === 'anthropic' && !adaptive ? thinkingBudget + 4096 : 8192,
    experimental_transform: smoothStream({ chunking: 'word', delayInMs: 40 }),
    providerOptions:
      selected.protocol === 'anthropic'
        ? {
            anthropic: {
              thinking: adaptive
                ? { type: 'adaptive' as const, display: 'summarized' as const }
                : { type: 'enabled' as const, budgetTokens: thinkingBudget },
              ...(adaptive ? { effort: reasoningEffort as 'low' | 'medium' | 'high' } : {}),
              metadata: { userId },
            },
          }
        : {
            // Provider name is `datum-ai-gateway` → camelCase key `datumAiGateway`.
            datumAiGateway: {
              reasoningEffort,
              user: userId,
            },
          },
    stopWhen: stepCountIs(10),
    tools: createAssistantTools({ accessToken: token }),
  });

  result.response.then(undefined, (err: unknown) => {
    logger.error('assistant stream failed', {
      userId,
      model: selected.id,
      protocol: selected.protocol,
      userMessage,
      error: formatAssistantError(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  });

  result.usage.then(
    (usage) => {
      logger.info('assistant request completed', {
        userId,
        model: selected.id,
        protocol: selected.protocol,
        userMessage,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
      });
    },
    () => {}
  );

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    onError: formatAssistantError,
  });
}

async function streamViaAnthropic(args: {
  messages: UIMessage[];
  clientOs?: string;
  requestedModel?: string;
  requestedEffort?: string;
  token: string;
  userId: string;
  userMessage?: string;
}) {
  const { messages, clientOs, requestedModel, requestedEffort, token, userId, userMessage } = args;

  if (!env.anthropicApiKey) {
    throw new Error('Anthropic API key is not configured');
  }

  const anthropic = createAnthropic({ apiKey: env.anthropicApiKey });
  const modelId = resolveDirectAnthropicModel(requestedModel);
  const thinkingBudget = resolveEffortBudget(requestedEffort);
  const reasoningEffort = resolveReasoningEffort(requestedEffort);
  const adaptive = usesAdaptiveThinking(modelId);

  const result = streamText({
    model: anthropic(modelId),
    system: buildSystemPrompt(clientOs),
    messages: await convertToModelMessages(messages.slice(-MAX_MESSAGES)),
    maxOutputTokens: adaptive ? 8192 : thinkingBudget + 4096,
    experimental_transform: smoothStream({ chunking: 'word', delayInMs: 40 }),
    providerOptions: {
      anthropic: {
        thinking: adaptive
          ? { type: 'adaptive' as const, display: 'summarized' as const }
          : { type: 'enabled' as const, budgetTokens: thinkingBudget },
        ...(adaptive ? { effort: reasoningEffort as 'low' | 'medium' | 'high' } : {}),
        metadata: { userId },
      },
    },
    stopWhen: stepCountIs(10),
    tools: createAssistantTools({ accessToken: token }),
  });

  result.response.then(undefined, (err: unknown) => {
    logger.error('assistant stream failed', {
      userId,
      model: modelId,
      protocol: 'anthropic-direct',
      userMessage,
      error: formatAssistantError(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  });

  result.usage.then(
    (usage) => {
      logger.info('assistant request completed', {
        userId,
        model: modelId,
        protocol: 'anthropic-direct',
        userMessage,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
      });
    },
    () => {}
  );

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    onError: formatAssistantError,
  });
}
