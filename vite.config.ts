import { lingui } from '@lingui/vite-plugin';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import { defineConfig } from 'vite';
import macrosPlugin from 'vite-plugin-babel-macros';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  resolve:
    process.env.NODE_ENV === 'development'
      ? {}
      : {
          alias: {
            'react-dom/server': 'react-dom/server.node',
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
  plugins: [
    tailwindcss(),
    reactRouter(),
    reactRouterHonoServer({
      runtime: 'bun',
    }),
    macrosPlugin(),
    lingui(),
    tsconfigPaths(),
  ],
});
