import { type RouteConfig, index, layout, prefix, route } from '@react-router/dev/routes';

export default [
  // Protected routes with auth
  layout('layouts/private.layout.tsx', [
    index('routes/dashboard/index.tsx'),

    // Users
    route('users', 'routes/user/layout.tsx', [
      index('routes/user/index.tsx'),

      route(':userId', 'routes/user/detail/layout.tsx', [index('routes/user/detail/index.tsx')]),
    ]),

    // Organizations
    route('organizations', 'routes/organization/layout.tsx', [
      index('routes/organization/index.tsx'),

      route(':orgName', 'routes/organization/detail/layout.tsx', [
        index('routes/organization/detail/index.tsx'),
        route('projects', 'routes/organization/detail/project.tsx'),
      ]),
    ]),

    // Projects
    route('projects', 'routes/project/layout.tsx', [
      index('routes/project/index.tsx'),

      route(':projectName', 'routes/project/detail/layout.tsx', [
        index('routes/project/detail/index.tsx'),
      ]),
    ]),

    route('demo', 'routes/demo.tsx'),
  ]),

  // Public routes without auth
  layout('layouts/public.layout.tsx', [
    route('login', 'routes/auth/login.tsx'),
    route('auth/callback', 'routes/auth/callback.tsx'),
  ]),

  // Global routes
  route('logout', 'routes/auth/logout.tsx'),
  ...prefix('action', [route('set-theme', 'routes/action/set-theme.tsx')]),
  ...prefix('error', [
    route('session-expired', 'routes/error/session-expired.tsx'),
    route('oauth-error', 'routes/error/oauth-error.tsx'),
  ]),

  // Catch-all route for 404 errors - must be last
  route('*', 'routes/error/not-found.tsx'),
] satisfies RouteConfig;
