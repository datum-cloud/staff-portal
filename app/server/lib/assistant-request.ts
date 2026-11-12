/**
 * Request validation and client-safe error text for POST /api/assistant.
 *
 * Kept free of `env` and the logger so it stays importable from unit tests.
 */
import { APICallError, type UIMessage } from 'ai';
import { z } from 'zod';

/**
 * Upper bound on the transcript the client may send. The browser sends the
 * whole conversation and the route replays only the most recent messages, so
 * this is a sanity cap, not the replay window.
 */
export const MAX_REQUEST_MESSAGES = 500;
const MAX_PARTS_PER_MESSAGE = 200;
const MAX_ID_LENGTH = 128;
const MAX_MODEL_ID_LENGTH = 128;

/**
 * A message part. Only the discriminator is checked: part shapes belong to the
 * AI SDK and vary by tool, and `convertToModelMessages` reads them.
 */
const messagePartSchema = z.looseObject({ type: z.string().min(1).max(MAX_ID_LENGTH) });

/**
 * `system` is not accepted: the client filters system messages out before
 * sending, and the server supplies its own system prompt.
 */
const messageSchema = z.looseObject({
  id: z.string().min(1).max(MAX_ID_LENGTH),
  role: z.enum(['user', 'assistant']),
  parts: z.array(messagePartSchema).max(MAX_PARTS_PER_MESSAGE),
});

export const assistantRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_REQUEST_MESSAGES),
  /** Matches `detectOs()` in the chat hook. Interpolated into the system prompt. */
  clientOs: z.enum(['macos', 'windows', 'linux', 'unknown']).optional(),
  model: z.string().min(1).max(MAX_MODEL_ID_LENGTH).optional(),
  effort: z.enum(['low', 'medium', 'high']).optional(),
});

export interface AssistantRequest {
  messages: UIMessage[];
  clientOs?: 'macos' | 'windows' | 'linux' | 'unknown';
  model?: string;
  effort?: 'low' | 'medium' | 'high';
}

export type AssistantRequestResult =
  | { success: true; data: AssistantRequest }
  | { success: false; issues: string[] };

export function parseAssistantRequest(body: unknown): AssistantRequestResult {
  const parsed = assistantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join('.') || '(body)'}: ${issue.message}`
      ),
    };
  }

  const { messages, clientOs, model, effort } = parsed.data;
  return {
    success: true,
    data: { messages: messages as unknown as UIMessage[], clientOs, model, effort },
  };
}

export const ASSISTANT_ERROR_MESSAGES = {
  generic: 'The assistant could not complete this request. Try again.',
  busy: 'The AI provider is busy right now. Try again in a moment.',
  tooLong: 'This conversation is too long for the model. Start a new chat.',
} as const;

const BUSY_STATUS_CODES = new Set([429, 503, 529]);
const TOO_LONG_STATUS_CODE = 413;
const TOO_LONG_PATTERN = /prompt is too long|context length|context window|too many tokens/i;
const MAX_CAUSE_DEPTH = 5;

/**
 * The provider call error, if one sits anywhere in the `cause` chain. The SDK's
 * RetryError carries the final failure as `lastError` instead of `cause`.
 */
function findApiCallError(error: unknown, depth = 0): APICallError | undefined {
  if (APICallError.isInstance(error)) return error;
  if (depth >= MAX_CAUSE_DEPTH || !(error instanceof Error)) return undefined;
  const { cause, lastError } = error as Error & { cause?: unknown; lastError?: unknown };
  return findApiCallError(cause ?? lastError, depth + 1);
}

/**
 * Fixed, client-safe text for an assistant failure. Provider response text is
 * only used to pick a category and is never returned.
 */
export function toClientErrorMessage(error: unknown): string {
  const apiError = findApiCallError(error);
  if (!apiError) return ASSISTANT_ERROR_MESSAGES.generic;

  const status = apiError.statusCode;
  if (status !== undefined && BUSY_STATUS_CODES.has(status)) return ASSISTANT_ERROR_MESSAGES.busy;

  const detail = `${apiError.message} ${apiError.responseBody ?? ''}`;
  if (status === TOO_LONG_STATUS_CODE || TOO_LONG_PATTERN.test(detail)) {
    return ASSISTANT_ERROR_MESSAGES.tooLong;
  }

  return ASSISTANT_ERROR_MESSAGES.generic;
}
