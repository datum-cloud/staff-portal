export const sentryConfig = {
  // Sourcemaps are only enabled for production builds on the main branch
  isSourcemapEnabled:
    process.env.NODE_ENV === 'production' && process.env.VERSION?.includes('main'),
  // Our self-hosted Sentry. The Sentry 11 bundler plugin defaults to
  // https://sentry.io, and the CLI refuses an upload whose host does not match
  // the auth token, so the upload silently skips without this.
  url: process.env.SENTRY_URL || 'https://sentry.prod.env.datum.net',
  org: 'sentry',
  project: 'staff-portal',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: process.env.VERSION || 'dev',
};
