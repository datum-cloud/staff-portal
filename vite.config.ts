import { sentryConfig } from './app/utils/config/sentry.config';
import { lingui } from '@lingui/vite-plugin';
import { reactRouter } from '@react-router/dev/vite';
import { sentryReactRouter } from '@sentry/react-router';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import { defineConfig } from 'vite';
import macrosPlugin from 'vite-plugin-babel-macros';
import tsconfigPaths from 'vite-tsconfig-paths';

// When running under Cypress (component tests) we cannot use the React Router
// dev plugin: it boots the app's Hono server inside Cypress's Vite dev server,
// which crashes on server-only imports. Instead we swap in @vitejs/plugin-react.
// tsconfigPaths() resolves the tsconfig `paths` aliases (@/, @/tests, @openapi)
// in every mode — the same approach cloud-portal uses.
const isCypress = !!process.env.CYPRESS;

export default defineConfig((config) => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    resolve: {
      ...(isProduction && {
        alias: {
          'react-dom/server': 'react-dom/server.node',
        },
      }),
    },
    server: {
      port: 3000,
    },
    ssr: {
      optimizeDeps: {
        include: ['react-dom/server.node'],
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      sourcemap: sentryConfig.isSourcemapEnabled ? 'hidden' : false,
    },
    // Keep the production/dev plugin pipeline byte-identical; only the Cypress
    // component-test pipeline swaps reactRouter()/hono/sentry for plugin-react.
    plugins: isCypress
      ? [tailwindcss(), macrosPlugin(), lingui(), react(), tsconfigPaths()]
      : [
          tailwindcss(),
          reactRouter(),
          reactRouterHonoServer({ runtime: 'bun' }),
          macrosPlugin(),
          lingui(),
          tsconfigPaths(),
          sentryReactRouter(
            {
              org: sentryConfig.org,
              project: sentryConfig.project,
              authToken: sentryConfig.authToken,
              release: { name: sentryConfig.release },
            },
            config
          ),
        ],
  };
});
