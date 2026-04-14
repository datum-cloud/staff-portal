import { getOrigin, toBoolean } from '@/utils/helpers';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.url(),
  API_URL: z.url(),
  AUTH_OIDC_ISSUER: z.url(),
  AUTH_OIDC_CLIENT_ID: z.string(),
  SESSION_SECRET: z.string().min(32),
  VERSION: z.string(),

  // Optional configuration
  CLOUD_PORTAL_URL: z.url().optional(),
  AUTH_OIDC_SCOPES: z.string().optional(),
  AUTH_OIDC_CLIENT_SECRET: z.string().optional(),
  OTEL_ENABLED: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_LOG_LEVEL: z.string().optional(),
  SENTRY_ENV: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function getEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((issue) => issue.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
}

const parsedEnv = getEnv();

export const env = {
  ...parsedEnv,
  authOidcScopes: parsedEnv.AUTH_OIDC_SCOPES
    ? parsedEnv.AUTH_OIDC_SCOPES.split(/[ ,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [],
  isDev: parsedEnv.NODE_ENV === 'development',
  isProd: parsedEnv.NODE_ENV === 'production',
  isTest: parsedEnv.NODE_ENV === 'test',
  isDebug: toBoolean(process.env.DEBUG),
  isCypress: toBoolean(process.env.CYPRESS),
  isOtelEnabled: toBoolean(parsedEnv.OTEL_ENABLED) && parsedEnv.OTEL_EXPORTER_OTLP_ENDPOINT !== '',
  isSentryEnabled: !!parsedEnv.SENTRY_DSN,
  sentryUiUrl: getOrigin(parsedEnv.SENTRY_DSN),
};
