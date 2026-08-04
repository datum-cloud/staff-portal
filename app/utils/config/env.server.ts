import { getOrigin, toBoolean } from '@/utils/helpers';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.url(),
  API_URL: z.url(),
  GRAPHQL_URL: z.url(),
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

  // Chatbot / AI assistant — prefer AI gateway; fall back to direct Anthropic
  // (prod still uses ANTHROPIC_* until the gateway is released there).
  CHATBOT_ENABLED: z.string().optional(),
  AI_GATEWAY_URL: z.url().optional(),
  AI_GATEWAY_TOKEN: z.string().optional(),
  AI_GATEWAY_TOKEN_FILE: z.string().optional(),
  AI_GATEWAY_MODEL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),

  // Sentry API (for chatbot tools)
  SENTRY_API_URL: z.string().optional(),
  SENTRY_API_TOKEN: z.string().optional(),
  SENTRY_ORGANIZATION: z.string().optional(),
  SENTRY_EXCLUDED_PROJECTS: z.string().default('staff-portal,internal'),

  // MCP cluster tools
  MCP_URL: z.string().optional(),
  MCP_API_KEY: z.string().optional(),

  // Staff access control
  STAFF_GROUP_NAME: z.string().default('staff-users'),

  // MaxMind minFraud account ID — used to deep-link from a fraud
  // evaluation's maxmind provider step into the MaxMind portal.
  MAXMIND_ACCOUNT_ID: z.string().optional(),

  // Optional: Amberflo usage query (read path for usage metering chart)
  //
  // AMBERFLO_API_KEY: secret key for POST /usage/sparse — never sent to browser.
  // AMBERFLO_BASE_URL: base URL for the Amberflo API, defaults to https://app.amberflo.io.
  // Meter names are discovered automatically from platform MeterDefinition resources.
  AMBERFLO_API_KEY: z.string().optional(),
  AMBERFLO_BASE_URL: z.url().optional(),
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
  chatbotEnabled: toBoolean(parsedEnv.CHATBOT_ENABLED),
  aiGatewayUrl: parsedEnv.AI_GATEWAY_URL,
  aiGatewayToken: parsedEnv.AI_GATEWAY_TOKEN,
  aiGatewayTokenFile: parsedEnv.AI_GATEWAY_TOKEN_FILE,
  aiGatewayModel: parsedEnv.AI_GATEWAY_MODEL,
  anthropicApiKey: parsedEnv.ANTHROPIC_API_KEY,
  anthropicModel: parsedEnv.ANTHROPIC_MODEL,
  sentryApiUrl: parsedEnv.SENTRY_API_URL,
  sentryApiToken: parsedEnv.SENTRY_API_TOKEN,
  sentryOrganization: parsedEnv.SENTRY_ORGANIZATION ?? 'sentry',
  sentryExcludedProjects: parsedEnv.SENTRY_EXCLUDED_PROJECTS
    ? parsedEnv.SENTRY_EXCLUDED_PROJECTS.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [],
  sentryEnvironment: parsedEnv.SENTRY_ENV,
  mcpUrl: parsedEnv.MCP_URL,
  mcpApiKey: parsedEnv.MCP_API_KEY,
  staffGroupName: parsedEnv.STAFF_GROUP_NAME,
  amberfloApiKey: parsedEnv.AMBERFLO_API_KEY,
  amberfloBaseUrl: parsedEnv.AMBERFLO_BASE_URL ?? 'https://app.amberflo.io',
};
