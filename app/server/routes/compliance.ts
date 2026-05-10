import { contractExtractionSchema } from '@/features/compliance/extract-schema';
import { EnvVariables } from '@/server/iface';
import { authMiddleware, getUserId } from '@/server/middleware';
import { env } from '@/utils/config/env.server';
import { logger } from '@/utils/logger';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject, NoObjectGeneratedError } from 'ai';
import { Hono } from 'hono';

export const complianceRoutes = new Hono<{ Variables: EnvVariables }>();

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
const EXTRACT_TIMEOUT_MS = 30_000;

const SYSTEM_PROMPT = [
  'You extract Datum Cloud compliance metadata from a vendor contract PDF (typically a Data Processing Agreement or Master Services Agreement).',
  'Return only the fields that are explicitly stated or clearly implied by the document.',
  'For any field you cannot determine with high confidence, return null. Do not guess.',
  'For the country, return the ISO 3166-1 alpha-2 code (US, DE, GB, FR, IE, etc.).',
  'For the effective date, return YYYY-MM-DD or null if no date is stated.',
  'For data categories, data subject types and transfer mechanism, only return values from the allowed enum lists in the schema.',
  'Processing regions should be ISO 3166-1 alpha-2 country codes or named regions like "US" or "EU".',
].join(' ');

complianceRoutes.post('/extract-contract', authMiddleware(), async (c) => {
  if (!env.anthropicApiKey) {
    return c.json(
      {
        code: 'OCR_NOT_CONFIGURED',
        message:
          'Contract OCR is not configured for this deployment. Set ANTHROPIC_API_KEY on the staff-portal deployment to enable it.',
      },
      503
    );
  }

  const userId = getUserId(c);

  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ code: 'INVALID_BODY', message: 'Expected multipart/form-data.' }, 400);
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return c.json({ code: 'MISSING_FILE', message: 'Upload a PDF in the `file` form field.' }, 400);
  }

  if (file.type !== 'application/pdf') {
    return c.json(
      {
        code: 'UNSUPPORTED_TYPE',
        message: `Expected application/pdf; received ${file.type || 'unknown content type'}.`,
      },
      415
    );
  }

  if (file.size > MAX_PDF_BYTES) {
    return c.json(
      {
        code: 'FILE_TOO_LARGE',
        message: `PDF must be under ${MAX_PDF_BYTES / (1024 * 1024)} MB.`,
      },
      413
    );
  }

  const startedAt = Date.now();
  try {
    const anthropic = createAnthropic({ apiKey: env.anthropicApiKey });
    const model = env.anthropicModel ?? 'claude-sonnet-4-6';

    const pdfBytes = new Uint8Array(await file.arrayBuffer());

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), EXTRACT_TIMEOUT_MS);

    try {
      const { object, usage } = await generateObject({
        model: anthropic(model),
        schema: contractExtractionSchema,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract Datum compliance metadata from the attached contract.',
              },
              {
                type: 'file',
                data: pdfBytes,
                mediaType: 'application/pdf',
                filename: file.name || 'contract.pdf',
              },
            ],
          },
        ],
        abortSignal: abortController.signal,
        providerOptions: {
          anthropic: { metadata: { user_id: userId } },
        },
      });

      logger.info('compliance contract extraction succeeded', {
        userId,
        model,
        sizeBytes: file.size,
        durationMs: Date.now() - startedAt,
        inputTokens: usage?.inputTokens,
        outputTokens: usage?.outputTokens,
      });

      return c.json(object);
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const isNoObject = NoObjectGeneratedError.isInstance(err);

    logger.error('compliance contract extraction failed', {
      userId,
      sizeBytes: file.size,
      durationMs: Date.now() - startedAt,
      reason: isAbort ? 'timeout' : isNoObject ? 'no-object' : 'unknown',
      error: err instanceof Error ? err.message : String(err),
    });

    if (isAbort) {
      return c.json(
        {
          code: 'TIMEOUT',
          message: `Extraction timed out after ${EXTRACT_TIMEOUT_MS / 1000}s.`,
        },
        504
      );
    }

    if (isNoObject) {
      return c.json(
        {
          code: 'EXTRACTION_FAILED',
          message:
            "Couldn't extract compliance fields from this PDF. Try a cleaner copy of the contract or fill the form manually.",
        },
        422
      );
    }

    return c.json({ code: 'INTERNAL', message: 'Failed to extract contract.' }, 500);
  }
});
