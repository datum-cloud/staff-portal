import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  layout('layouts/private.layout.tsx', [
    index('routes/dashboard.tsx'),
    route('logout', 'routes/auth/logout.tsx'),
  ]),

  layout('layouts/public.layout.tsx', [
    route('login', 'routes/auth/login.tsx'),
    route('auth/callback', 'routes/auth/callback.tsx'),
  ]),
] satisfies RouteConfig;
