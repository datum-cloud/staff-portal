import { buildSystemPrompt, createAssistantTools } from '@/modules/assistant';
import { EnvVariables } from '@/server/iface';
import {
  createGatewayLanguageModel,
  fetchGatewayModels,
  isAiGatewayConfigured,
  resolveGatewayModel,
} from '@/server/lib/ai-gateway';
import { authMiddleware, getToken, getUserId } from '@/server/middleware';
import { env } from '@/utils/config/env.server';
import { logger } from '@/utils/logger';
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

assistantRoutes.get('/models', authMiddleware(), async (c) => {
  if (!env.chatbotEnabled || !isAiGatewayConfigured()) {
    return c.json({ error: 'AI assistant is not configured' }, 503);
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
  if (!env.chatbotEnabled || !isAiGatewayConfigured()) {
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
      maxOutputTokens:
        selected.protocol === 'anthropic' && !adaptive ? thinkingBudget + 4096 : 8192,
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
      // SDK defaults to "An error occurred." to avoid leaking details; staff
      // operators need the real provider message when debugging the gateway.
      onError: formatAssistantError,
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
