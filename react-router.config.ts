import { sentryConfig } from './app/utils/config/sentry.config';
import type { Config } from '@react-router/dev/config';
import { sentryOnBuildEnd } from '@sentry/react-router';

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  future: {
    // Let Vite's dependency scan crawl every route at startup, so dev doesn't
    // discover deps per page and reload.
    unstable_optimizeDeps: true,
  },
  buildEnd: async ({ viteConfig, reactRouterConfig, buildManifest }) => {
    if (sentryConfig.isSourcemapEnabled) {
      await sentryOnBuildEnd({ viteConfig, reactRouterConfig, buildManifest });
    }
  },
} satisfies Config;
