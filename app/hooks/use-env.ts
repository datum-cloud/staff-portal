import { useMatches } from 'react-router';

/**
 * Public env shape exposed to the client via the root loader (window.ENV).
 * Keep in sync with the ENV object returned by the root loader.
 */
export interface PublicEnv {
  DEBUG?: boolean;
  SENTRY_ENV?: string;
  SENTRY_DSN?: string;
  SENTRY_UI_URL?: string;
  VERSION?: string;
  AUTH_OIDC_ISSUER?: string;
  CLOUD_PORTAL_URL?: string;
  CHATBOT_ENABLED?: boolean;
  MCP_ENABLED?: boolean;
}

export function useEnv(): PublicEnv | undefined {
  const matches = useMatches();
  const rootData = matches[0]?.data as { ENV?: PublicEnv } | undefined;
  return rootData?.ENV;
}
