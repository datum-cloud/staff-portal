import { sentryConfig } from './app/utils/config/sentry.config';
import { lingui } from '@lingui/vite-plugin';
import { reactRouter } from '@react-router/dev/vite';
import { sentryReactRouter } from '@sentry/react-router';
import tailwindcss from '@tailwindcss/vite';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import { defineConfig } from 'vite';
import macrosPlugin from 'vite-plugin-babel-macros';

export default defineConfig((config) => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    resolve: {
      tsconfigPaths: true,
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
    plugins: [
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
