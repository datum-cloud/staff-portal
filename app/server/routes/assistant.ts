import { buildSystemPrompt, createAssistantTools } from '@/modules/assistant';
import { EnvVariables } from '@/server/iface';
import { authMiddleware, getToken, getUserId } from '@/server/middleware';
import { env } from '@/utils/config/env.server';
import { logger } from '@/utils/logger';
import { createAnthropic } from '@ai-sdk/anthropic';
import { convertToModelMessages, smoothStream, stepCountIs, streamText, type UIMessage } from 'ai';
import { Hono } from 'hono';

export const assistantRoutes = new Hono<{ Variables: EnvVariables }>();

const MAX_MESSAGES = 50;

/**
 * Allowlist for client-selected models (the prompt card's model picker). The
 * client sends a short id; we map it to a real model here so an arbitrary
 * client string can never reach the provider. Unknown/absent ids fall back to
 * the env-configured default.
 */
const MODEL_ALLOWLIST: Record<string, string> = {
  'sonnet-4-6': 'claude-sonnet-4-6',
  'haiku-4-5': 'claude-haiku-4-5-20251001',
};

/** Effort → extended-thinking token budget. */
const EFFORT_BUDGETS = { low: 4000, medium: 10000, high: 20000 } as const;
const DEFAULT_THINKING_BUDGET = 10000;

function resolveEffortBudget(effort: unknown): number {
  return typeof effort === 'string' && effort in EFFORT_BUDGETS
    ? EFFORT_BUDGETS[effort as keyof typeof EFFORT_BUDGETS]
    : DEFAULT_THINKING_BUDGET;
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

assistantRoutes.post('/', authMiddleware(), async (c) => {
  if (!env.chatbotEnabled || !env.anthropicApiKey) {
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

  const lastUserMessage = messages.findLast((m) => m.role === 'user');
  const userMessage = lastUserMessage?.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join(' ')
    .slice(0, 500);

  if (!checkRateLimit(userId)) {
    return c.json({ error: 'Too Many Requests' }, 429);
  }

  try {
    const anthropic = createAnthropic({ apiKey: env.anthropicApiKey });
    const model =
      (requestedModel && MODEL_ALLOWLIST[requestedModel]) ??
      env.anthropicModel ??
      'claude-sonnet-4-6';
    const thinkingBudget = resolveEffortBudget(requestedEffort);

    const result = streamText({
      model: anthropic(model),
      system: buildSystemPrompt(clientOs),
      messages: await convertToModelMessages(messages.slice(-MAX_MESSAGES)),
      // Anthropic requires max_tokens > thinking budget; keep headroom for the
      // reply on top of whatever budget the selected effort maps to.
      maxOutputTokens: thinkingBudget + 4096,
      experimental_transform: smoothStream({ chunking: 'word', delayInMs: 40 }),
      providerOptions: {
        anthropic: {
          thinking: {
            type: 'enabled',
            budgetTokens: thinkingBudget,
          },
          metadata: { user_id: userId },
        },
      },
      stopWhen: stepCountIs(10),
      tools: createAssistantTools({ accessToken: token }),
    });

    result.response.then(undefined, (err: unknown) => {
      logger.error('assistant stream failed', {
        userId,
        model,
        userMessage,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    });

    result.usage.then(
      (usage) => {
        logger.info('assistant request completed', {
          userId,
          model,
          userMessage,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
        });
      },
      () => {}
    );

    return result.toUIMessageStreamResponse({ sendReasoning: true });
  } catch (err) {
    logger.error('assistant request failed', {
      userId,
      userMessage,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return c.json({ error: 'Failed to start assistant' }, 500);
  }
});
