import { SYSTEM_PROMPT } from '@/features/assistant/lib/system-prompt';
import { createTools } from '@/features/assistant/lib/tool-definitions';
import { apiRequest } from '@/modules/axios/axios.server';
import { LokiActivityLogsService, QueryParams } from '@/modules/loki/server';
import { PrometheusService } from '@/modules/prometheus';
import { EnvVariables } from '@/server/iface';
import { logApiError, logApiSuccess } from '@/server/logger';
import { authMiddleware, getToken } from '@/server/middleware';
import { createErrorResponse, createSuccessResponse } from '@/server/response';
import { env } from '@/utils/config/env.server';
import { captureApiError, createRequestLogger } from '@/utils/logger';
import { createAnthropic } from '@ai-sdk/anthropic';
import { formatDataStreamPart } from '@ai-sdk/ui-utils';
import { streamText } from 'ai';
import { Hono } from 'hono';
import { stream } from 'hono/streaming';

const API_BASENAME = '/api';

// Create an API Hono app
const api = new Hono<{ Variables: EnvVariables }>();

// Helper function to extract request context
const extractRequestContext = (c: any) => ({
  path: c.req.path,
  method: c.req.method,
  url: c.req.url,
  userAgent: c.req.header('User-Agent'),
  ip:
    c.req.header('x-forwarded-for') ||
    c.req.header('x-real-ip') ||
    c.req.header('x-client-ip') ||
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded') ||
    'unknown',
});

// Helper function to create success response with common headers
const createSuccessResponseWithHeaders = (c: any, reqId: string, data: any, path: string) => {
  return c.json(createSuccessResponse(reqId, data, path), 200, {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });
};

// Public endpoint (no auth required)
api.get('/', async (c) => {
  return c.json({ message: 'Staff API' });
});

// Internal proxy route - catch-all for /api/internal/*
api.all('/internal/*', authMiddleware(), async (c) => {
  const startTime = performance.now();
  const reqLogger = createRequestLogger(c);
  const reqId = c.get('requestId');
  const requestContext = extractRequestContext(c);

  reqLogger.info('API Request Started', requestContext);

  const path = c.req.path.replace(/^\/api\/internal/, '').replace(/^\//, '');

  try {
    // Get query parameters
    const searchParams = c.req.query();
    const queryString = new URLSearchParams(searchParams).toString();
    const fullTargetUrl = queryString ? `${path}?${queryString}` : path;
    const token = getToken(c);

    // Prepare headers for the proxy request
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    // Forward content type if present
    const contentType = c.req.header('Content-Type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    // Forward accept header if present
    const accept = c.req.header('Accept');
    if (accept) {
      headers['Accept'] = accept;
    }

    // Forward user agent if present
    const userAgent = c.req.header('User-Agent');
    if (userAgent) {
      headers['User-Agent'] = userAgent;
    }

    // Forward the client IP so the API server audit log captures it in sourceIPs.
    const clientIP = c.req.header('X-Forwarded-For')?.split(',')[0]?.trim();
    if (clientIP) {
      headers['X-Forwarded-For'] = clientIP;
    }

    // Prepare request body for non-GET requests
    let requestBody: string | undefined;
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      requestBody = await c.req.text();
    }

    // Forward the request to the actual API
    const response = await apiRequest({
      method: c.req.method,
      url: fullTargetUrl,
      headers,
      ...(requestBody && { data: requestBody }),
    }).execute();

    const duration = Math.round(performance.now() - startTime);

    // Log success
    logApiSuccess(reqLogger, {
      path,
      method: c.req.method,
      duration,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
    });

    return createSuccessResponseWithHeaders(c, reqId, response, path);
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);

    // Use typed error logging
    await logApiError(reqLogger, error, {
      path,
      method: c.req.method,
      duration,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
    });

    // Capture server-side API errors to Sentry
    if (error instanceof Error) {
      captureApiError(error, {
        url: path,
        method: c.req.method,
        requestId: reqId,
      });
    }

    if (env.isDebug) {
      reqLogger.debug('Full error details', { error });
    }

    const { response, status } = await createErrorResponse(reqId, error, path);
    return c.json(response, status as any);
  }
});

// Activity API - now handled client-side via CRD API
// This endpoint is kept for backward compatibility but should not be used
api.get('/activity', authMiddleware(), async (c) => {
  const startTime = performance.now();
  const reqLogger = createRequestLogger(c);
  const reqId = c.get('requestId');
  const requestContext = extractRequestContext(c);

  reqLogger.info('Activity API Request Started (deprecated)', requestContext);

  try {
    // Return empty response - activity queries should use client-side CRD API
    const response = {
      logs: [],
      query: '',
      timeRange: {
        start: '',
        end: '',
      },
      nextPageToken: undefined,
      hasNextPage: false,
    };

    const duration = Math.round(performance.now() - startTime);

    logApiSuccess(reqLogger, {
      path: c.req.path,
      method: c.req.method,
      duration,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
    });

    return createSuccessResponseWithHeaders(c, reqId, response, c.req.path);
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);

    await logApiError(reqLogger, error, {
      path: c.req.path,
      method: c.req.method,
      duration,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
    });

    if (error instanceof Error) {
      captureApiError(error, {
        url: c.req.path,
        method: c.req.method,
        requestId: reqId,
      });
    }

    const { response, status } = await createErrorResponse(reqId, error, '/activity');
    return c.json(response, status as any);
  }
});

// Metrics API (get data from Prometheus)
api.post('/metrics', authMiddleware(), async (c) => {
  const startTime = performance.now();
  const reqLogger = createRequestLogger(c);
  const reqId = c.get('requestId');
  const requestContext = extractRequestContext(c);

  reqLogger.info('Metrics API Request Started', requestContext);

  try {
    const token = getToken(c);
    const body = await c.req.json();
    const { type, ...params } = body;

    if (!type) {
      throw new Error('Query type is required');
    }

    const service = new PrometheusService(token);
    const response = await service.handleAPIRequest({ type, ...params });

    const duration = Math.round(performance.now() - startTime);

    // Log success
    logApiSuccess(reqLogger, {
      path: c.req.path,
      method: c.req.method,
      duration,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
    });

    return createSuccessResponseWithHeaders(c, reqId, response, c.req.path);
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);

    // Use typed error logging
    await logApiError(reqLogger, error, {
      path: c.req.path,
      method: c.req.method,
      duration,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
    });

    // Capture server-side API errors to Sentry
    if (error instanceof Error) {
      captureApiError(error, {
        url: c.req.path,
        method: c.req.method,
        requestId: reqId,
      });
    }

    const { response, status } = await createErrorResponse(reqId, error, '/metrics');
    return c.json(response, status as any);
  }
});

// ---- Assistant API ----

const MAX_TOOL_ROUNDS = 20;
const MAX_MESSAGES_CAP = 50;
const MAX_MESSAGE_CONTENT_LENGTH = 100_000;

interface AssistantRequestMessage {
  role: 'user' | 'assistant';
  content: string;
}

const VALID_ROLES = new Set<string>(['user', 'assistant']);

/**
 * Validates the messages array from the request body.
 * Returns an error string if invalid, or null if valid.
 */
function validateMessages(messages: unknown): string | null {
  if (!Array.isArray(messages)) {
    return 'messages must be an array';
  }
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (typeof msg !== 'object' || msg === null) {
      return `messages[${i}] must be an object`;
    }
    const { role, content } = msg as Record<string, unknown>;
    if (!VALID_ROLES.has(role as string)) {
      return `messages[${i}].role must be 'user' or 'assistant'`;
    }
    if (typeof content !== 'string') {
      return `messages[${i}].content must be a string`;
    }
    if (content.length > MAX_MESSAGE_CONTENT_LENGTH) {
      return `messages[${i}].content exceeds maximum length of ${MAX_MESSAGE_CONTENT_LENGTH} characters`;
    }
  }
  return null;
}

api.post('/assistant', authMiddleware(), async (c) => {
  const reqLogger = createRequestLogger(c);

  if (!env.ANTHROPIC_API_KEY) {
    return c.json({ error: 'Assistant is not configured (missing ANTHROPIC_API_KEY)' }, 503);
  }

  const token = getToken(c);
  let body: { messages: unknown };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }

  const validationError = validateMessages(body.messages);
  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  const messages = (body.messages as AssistantRequestMessage[])
    .slice(-MAX_MESSAGES_CAP)
    .map((m) => ({ role: m.role, content: m.content }));

  const systemPrompt =
    SYSTEM_PROMPT + `\n\n## Current date\n\nToday is ${new Date().toISOString().slice(0, 10)}.`;

  const anthropicProvider = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

  try {
    const result = streamText({
      model: anthropicProvider(model),
      system: systemPrompt,
      messages,
      maxSteps: MAX_TOOL_ROUNDS,
      tools: createTools(token),
      onError: ({ error }) => {
        reqLogger.error('Assistant stream error', {
          error: error instanceof Error ? error.message : String(error),
        });
      },
    });

    // Stream via fullStream so we can inject "\n\n" between steps,
    // preventing multi-step text from running together without spacing.
    return stream(c, async (s) => {
      for await (const chunk of result.fullStream) {
        if (chunk.type === 'text-delta') {
          await s.write(formatDataStreamPart('text', chunk.textDelta));
        } else if (chunk.type === 'step-start') {
          await s.write(formatDataStreamPart('start_step', { messageId: chunk.messageId }));
        } else if (chunk.type === 'tool-call') {
          await s.write(formatDataStreamPart('tool_call', chunk));
        } else if (chunk.type === 'tool-result') {
          // chunk includes args/toolName which aren't in the external type — cast is safe
          await s.write(formatDataStreamPart('tool_result', chunk as any));
        } else if (chunk.type === 'step-finish') {
          await s.write(
            formatDataStreamPart('finish_step', {
              finishReason: chunk.finishReason,
              usage: chunk.usage,
              isContinued: chunk.isContinued,
            })
          );
          // Inject a blank line so the next step's text doesn't run into this one
          if (chunk.isContinued) {
            await s.write(formatDataStreamPart('text', '\n\n'));
          }
        } else if (chunk.type === 'finish') {
          await s.write(
            formatDataStreamPart('finish_message', {
              finishReason: chunk.finishReason,
              usage: chunk.usage,
            })
          );
        }
      }
    });
  } catch (err) {
    reqLogger.error('Assistant request error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ error: 'An error occurred. Please try again.' }, 500);
  }
});

export { api, API_BASENAME };
