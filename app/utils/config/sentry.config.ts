export const sentryConfig = {
  // Sourcemaps are only enabled for production builds on the main branch
  isSourcemapEnabled:
    process.env.NODE_ENV === 'production' && process.env.VERSION?.includes('main'),
  org: 'sentry',
  project: 'staff-portal',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: process.env.VERSION || 'dev',
};
