import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    ssr: 'observability/index.ts',
    outDir: 'build/observability',
    emptyOutDir: true,
    target: 'node26',
  },
});
