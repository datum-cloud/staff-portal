import { sentryConfig } from './app/utils/config/sentry.config';
import { lingui } from '@lingui/vite-plugin';
import { reactRouter } from '@react-router/dev/vite';
import { sentryReactRouter } from '@sentry/react-router';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import { defineConfig } from 'vite';
import macrosPlugin from 'vite-plugin-babel-macros';

// When running under Cypress (component tests) we cannot use the React Router
// dev plugin: it boots the app's Hono server inside Cypress's Vite dev server,
// which crashes on server-only imports. Instead we swap in @vitejs/plugin-react
// and resolve the path aliases ourselves (normally provided by reactRouter()).
const isCypress = !!process.env.CYPRESS;
const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig((config) => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    resolve: {
      tsconfigPaths: true,
      alias: {
        ...(isProduction && {
          'react-dom/server': 'react-dom/server.node',
        }),
        // reactRouter() resolves tsconfig paths during the normal build; under
        // Cypress it's absent, so map the aliases explicitly (longest first).
        ...(isCypress && {
          '@openapi': fromRoot('./app/resources/openapi'),
          '@/tests': fromRoot('./tests'),
          '@': fromRoot('./app'),
        }),
      },
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
      ? [tailwindcss(), macrosPlugin(), lingui(), react()]
      : [
          tailwindcss(),
          reactRouter(),
          reactRouterHonoServer({ runtime: 'bun' }),
          macrosPlugin(),
          lingui(),
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
