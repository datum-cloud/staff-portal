import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  publicDir: false,
  plugins: [tsconfigPaths()],
  build: {
    ssr: 'observability/index.ts',
    outDir: 'build/observability',
    emptyOutDir: true,
    target: 'node26',
  },
});
