import { type RouteConfig, index, layout, prefix, route } from '@react-router/dev/routes';

export default [
  // Protected routes with auth
  layout('layouts/private.layout.tsx', [
    index('routes/dashboard/index.tsx'),

    // Customers
    route('customers', 'routes/customers/layout.tsx', [
      index('routes/customers/index.tsx'),

      // Users
      route('users', 'routes/user/layout.tsx', [
        index('routes/user/index.tsx'),

        route(':userId', 'routes/user/detail/layout.tsx', [
          index('routes/user/detail/index.tsx'),
          route('organizations', 'routes/user/detail/organization.tsx'),
          route('activity', 'routes/user/detail/activity.tsx'),
          route('email-activity', 'routes/user/detail/email-activity/layout.tsx', [
            index('routes/user/detail/email-activity/index.tsx'),
            route(':namespace/:emailName', 'routes/user/detail/email-activity/detail.tsx'),
          ]),
        ]),
      ]),

      // Organizations
      route('organizations', 'routes/organization/layout.tsx', [
        index('routes/organization/index.tsx'),

        route(':orgName', 'routes/organization/detail/layout.tsx', [
          index('routes/organization/detail/index.tsx'),
          route('members', 'routes/organization/detail/member.tsx'),
          route('projects', 'routes/organization/detail/project.tsx'),
          route('activity', 'routes/organization/detail/activity.tsx'),
          route('quotas', 'routes/organization/detail/quota/layout.tsx', [
            index('routes/organization/detail/quota/index.tsx'),
            route('usage', 'routes/organization/detail/quota/usage.tsx'),
            route('grants', 'routes/organization/detail/quota/grant.tsx'),
          ]),
        ]),
      ]),

      // Projects
      route('projects', 'routes/project/layout.tsx', [
        index('routes/project/index.tsx'),

        route(':projectName', 'routes/project/detail/layout.tsx', [
          index('routes/project/detail/index.tsx'),
          route('activity', 'routes/project/detail/activity.tsx'),
          route('export-policies', 'routes/project/detail/export-policy/layout.tsx', [
            index('routes/project/detail/export-policy/index.tsx'),
            route(':exportPolicyName', 'routes/project/detail/export-policy/detail.tsx'),
          ]),
          route('dns', 'routes/project/detail/dns/layout.tsx', [
            index('routes/project/detail/dns/index.tsx'),
            route(':namespace/:dnsName', 'routes/project/detail/dns/detail.tsx'),
          ]),
          route('domains', 'routes/project/detail/domain/layout.tsx', [
            index('routes/project/detail/domain/index.tsx'),
            route(':namespace/:domainName', 'routes/project/detail/domain/detail.tsx'),
          ]),
          route('http-proxies', 'routes/project/detail/httpproxy/layout.tsx', [
            index('routes/project/detail/httpproxy/index.tsx'),
            route(':httpProxyName', 'routes/project/detail/httpproxy/detail.tsx'),
          ]),
          route('quotas', 'routes/project/detail/quota/layout.tsx', [
            index('routes/project/detail/quota/index.tsx'),
            route('usage', 'routes/project/detail/quota/usage.tsx'),
            route('grants', 'routes/project/detail/quota/grant.tsx'),
          ]),
          route('secrets', 'routes/project/detail/secret.tsx'),
        ]),
      ]),
    ]),

    // Activity
    route('activity', 'routes/activity.tsx'),

    // Contacts
    route('contacts', 'routes/contact/layout.tsx', [
      index('routes/contact/index.tsx'),
      route('create', 'routes/contact/create.tsx'),
      route(':namespace/:contactName', 'routes/contact/edit.tsx'),
    ]),

    // Contact Groups
    route('contact-groups', 'routes/contact-group/layout.tsx', [
      index('routes/contact-group/index.tsx'),
      route('create', 'routes/contact-group/create.tsx'),
      route(':contactGroupName', 'routes/contact-group/detail/layout.tsx', [
        index('routes/contact-group/detail/index.tsx'),
        route('members', 'routes/contact-group/detail/member.tsx'),
      ]),
    ]),

    // Groups
    route('groups', 'routes/group/layout.tsx', [
      index('routes/group/index.tsx'),
      route(':groupName', 'routes/group/member.tsx'),
    ]),

    // Email Activity
    route('email-activity', 'routes/email-activity/layout.tsx', [
      index('routes/email-activity/index.tsx'),
      route(':namespace/:emailName', 'routes/email-activity/detail.tsx'),
    ]),

    // Profile
    route('profile', 'routes/profile/layout.tsx', [
      index('routes/profile/index.tsx'),
      route('settings', 'routes/profile/setting.tsx'),
      route('sessions', 'routes/profile/session.tsx'),
    ]),

    route('demo', 'routes/demo.tsx'),
    route('test-sentry', 'routes/test-sentry.tsx'),
  ]),

  // Public routes without auth
  layout('layouts/public.layout.tsx', [
    route('login', 'routes/auth/login.tsx'),
    route('auth/callback', 'routes/auth/callback.tsx'),
  ]),

  // Global routes
  route('logout', 'routes/auth/logout.tsx'),
  ...prefix('error', [
    route('session-expired', 'routes/error/session-expired.tsx'),
    route('oauth-error', 'routes/error/oauth-error.tsx'),
  ]),

  // Catch-all route for 404 errors - must be last
  route('*', 'routes/error/not-found.tsx'),
] satisfies RouteConfig;
