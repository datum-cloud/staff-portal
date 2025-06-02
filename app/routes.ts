import { type RouteConfig, index, layout, prefix, route } from '@react-router/dev/routes';

export default [
  layout('layouts/private.layout.tsx', [
    index('routes/dashboard.tsx'),
    route('customers', 'routes/customers/layout.tsx', [
      index('routes/customers/index.tsx'),
      route('users', 'routes/customers/user.tsx'),
      route('organizations', 'routes/customers/organization.tsx'),
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
    route('logout', 'routes/auth/logout.tsx'),

    route('demo', 'routes/demo.tsx'),
  ]),

  layout('layouts/public.layout.tsx', [
    route('login', 'routes/auth/login.tsx'),
    route('auth/callback', 'routes/auth/callback.tsx'),
  ]),

  ...prefix('action', [route('set-theme', 'routes/action/set-theme.tsx')]),
] satisfies RouteConfig;
