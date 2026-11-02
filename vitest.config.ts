import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ['app/**/*.test.{ts,tsx}'],
    environment: 'node',
    execArgv: ['--expose-gc'],
    env: {
      APP_URL: 'http://localhost:3000',
      API_URL: 'http://127.0.0.1:1',
      GRAPHQL_URL: 'http://127.0.0.1:1/graphql',
      AUTH_OIDC_ISSUER: 'http://127.0.0.1:1',
      AUTH_OIDC_CLIENT_ID: 'test',
      SESSION_SECRET: 'test-session-secret-at-least-32-chars',
      VERSION: 'test',
    },
  },
});
