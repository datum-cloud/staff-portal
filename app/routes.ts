import { type RouteConfig, index, layout, prefix, route } from '@react-router/dev/routes';

export default [
  layout('layouts/private.layout.tsx', [
    index('routes/dashboard.tsx'),
    route('customers', 'routes/customer/layout.tsx', [
      index('routes/customer/index.tsx'),
      route('users', 'routes/customer/user.tsx'),
      route('organizations', 'routes/customer/organization.tsx'),
    ]),
    route('marketing', 'routes/marketing/layout.tsx', [
      index('routes/marketing/index.tsx'),
      route('contacts', 'routes/marketing/contact.tsx'),
      route('subscriptions', 'routes/marketing/subscription.tsx'),
    ]),
    route('organizations', 'routes/organization/layout.tsx', [
      index('routes/organization/index.tsx'),
      route('members', 'routes/organization/member.tsx'),
      route('settings', 'routes/organization/setting.tsx'),
    ]),
    route('relationships', 'routes/relationship/layout.tsx', [
      index('routes/relationship/index.tsx'),
      route('vendors', 'routes/relationship/vendor.tsx'),
    ]),

    route('demo', 'routes/demo.tsx'),
  ]),

  layout('layouts/public.layout.tsx', [
    route('login', 'routes/auth/login.tsx'),
    route('auth/callback', 'routes/auth/callback.tsx'),
  ]),

  route('logout', 'routes/auth/logout.tsx'),

  ...prefix('action', [route('set-theme', 'routes/action/set-theme.tsx')]),
  ...prefix('error', [route('session-expired', 'routes/error/session-expired.tsx')]),
] satisfies RouteConfig;
