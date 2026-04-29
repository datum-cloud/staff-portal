import tailwindcss from '@tailwindcss/vite';
import macrosPlugin from 'vite-plugin-babel-macros';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [tailwindcss(), macrosPlugin()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup/unit/global.mocks.tsx', './tests/setup/unit/vitest.setup.ts'],
    globals: true,
    include: ['app/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'build', 'tests/e2e'],
  },
});
