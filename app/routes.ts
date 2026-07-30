import { type RouteConfig, index, layout, prefix, route } from '@react-router/dev/routes';

export default [
  // Protected routes with auth.
  // Shell switch: 'layouts/private.layout.tsx' = legacy, 'layouts/milo.layout.tsx' = new Milo shell.
  layout('layouts/milo.layout.tsx', [
    // Home (#554): the full-page assistant workspace replaces the old KPI
    // dashboard, which is preserved at /overview.
    index('routes/dashboard/index.tsx'),
    route('overview', 'routes/dashboard/overview.tsx'),

    // Customers
    route('customers', 'routes/customer/layout.tsx', [
      index('routes/customer/index.tsx'),

      // Users
      route('users', 'routes/customer/user/layout.tsx', [
        index('routes/customer/user/index.tsx'),

        route(':userId', 'routes/customer/user/detail/layout.tsx', { id: 'user-detail' }, [
          index('routes/customer/user/detail/index.tsx'),
          route('organizations', 'routes/customer/user/detail/organization.tsx'),
          route('contacts', 'routes/customer/user/detail/contacts.tsx'),
          route('activity', 'routes/customer/user/detail/activity/layout.tsx', [
            index('routes/customer/user/detail/activity/index.tsx'),
            route('audit-logs', 'routes/customer/user/detail/activity/audit-logs.tsx'),
          ]),
          route('email-activity', 'routes/customer/user/detail/email-activity.tsx'),
        ]),
      ]),

      // Organizations
      route('organizations', 'routes/customer/organization/layout.tsx', [
        index('routes/customer/organization/index.tsx'),

        route(
          ':orgName',
          'routes/customer/organization/detail/layout.tsx',
          { id: 'organization-detail' },
          [
            index('routes/customer/organization/detail/index.tsx'),
            route('members', 'routes/customer/organization/detail/member.tsx'),
            route('projects', 'routes/customer/organization/detail/project.tsx'),
            route('domains', 'routes/customer/organization/detail/domain.tsx'),
            route('edges', 'routes/customer/organization/detail/edge.tsx'),
            route('dns', 'routes/customer/organization/detail/dns.tsx'),
            route('activity', 'routes/customer/organization/detail/activity/layout.tsx', [
              index('routes/customer/organization/detail/activity/index.tsx'),
              route('events', 'routes/customer/organization/detail/activity/events.tsx'),
              route('audit-logs', 'routes/customer/organization/detail/activity/audit-logs.tsx'),
            ]),
            route('quotas', 'routes/customer/organization/detail/quota/layout.tsx', [
              index('routes/customer/organization/detail/quota/index.tsx'),
              route('usage', 'routes/customer/organization/detail/quota/usage.tsx'),
              route('grants', 'routes/customer/organization/detail/quota/grant.tsx'),
            ]),
            route('feature-flags', 'routes/customer/organization/detail/feature-flags.tsx'),
            route('usage', 'routes/customer/organization/detail/usage/index.tsx'),
          ]
        ),
      ]),

      // Projects
      route('projects', 'routes/customer/project/layout.tsx', [
        index('routes/customer/project/index.tsx'),

        route(
          ':projectName',
          'routes/customer/project/detail/layout.tsx',
          { id: 'project-detail' },
          [
            index('routes/customer/project/detail/index.tsx'),
            route('activity', 'routes/customer/project/detail/activity/layout.tsx', [
              index('routes/customer/project/detail/activity/index.tsx'),
              route('events', 'routes/customer/project/detail/activity/events.tsx'),
              route('audit-logs', 'routes/customer/project/detail/activity/audit-logs.tsx'),
            ]),
            route('export-policies', 'routes/customer/project/detail/export-policy/layout.tsx', [
              index('routes/customer/project/detail/export-policy/index.tsx'),
              route(':exportPolicyName', 'routes/customer/project/detail/export-policy/detail.tsx'),
            ]),
            route('dns', 'routes/customer/project/detail/dns/layout.tsx', [
              index('routes/customer/project/detail/dns/index.tsx'),
              route(':namespace/:dnsName', 'routes/customer/project/detail/dns/detail.tsx'),
            ]),
            route('domains', 'routes/customer/project/detail/domain/layout.tsx', [
              index('routes/customer/project/detail/domain/index.tsx'),
              route(':namespace/:domainName', 'routes/customer/project/detail/domain/detail.tsx'),
            ]),
            route('edges', 'routes/customer/project/detail/edge/layout.tsx', [
              index('routes/customer/project/detail/edge/index.tsx'),
              route(':edgeName', 'routes/customer/project/detail/edge/detail.tsx'),
            ]),
            route('quotas', 'routes/customer/project/detail/quota/layout.tsx', [
              index('routes/customer/project/detail/quota/index.tsx'),
              route('usage', 'routes/customer/project/detail/quota/usage.tsx'),
              route('grants', 'routes/customer/project/detail/quota/grant.tsx'),
            ]),
            route('secrets', 'routes/customer/project/detail/secret.tsx'),
          ]
        ),
      ]),

      // Resources (Customers → Resources): AI Edge / DNS / Domains tabs.
      route('resources', 'routes/customer/resource/layout.tsx', [
        index('routes/customer/resource/index.tsx'),
        route('edges', 'routes/customer/resource/edge/layout.tsx', [
          index('routes/customer/resource/edge/index.tsx'),
        ]),
        route('dns', 'routes/customer/resource/dns/layout.tsx', [
          index('routes/customer/resource/dns/index.tsx'),
        ]),
        route('domains', 'routes/customer/resource/domain/layout.tsx', [
          index('routes/customer/resource/domain/index.tsx'),
        ]),
      ]),

      // Billing Accounts (moved from Finance)
      route('billing-accounts', 'routes/customer/billing-account/layout.tsx', [
        index('routes/customer/billing-account/index.tsx'),
        route(
          ':orgName/:accountName',
          'routes/customer/billing-account/detail/layout.tsx',
          { id: 'billing-account-detail' },
          [index('routes/customer/billing-account/detail/index.tsx')]
        ),
      ]),

      // Fraud & Abuse (moved from Operations)
      route('fraud', 'routes/customer/fraud/layout.tsx', [
        index('routes/customer/fraud/index.tsx'),
        route('providers', 'routes/customer/fraud/providers/layout.tsx', [
          index('routes/customer/fraud/providers/index.tsx'),
          route('create', 'routes/customer/fraud/providers/create.tsx'),
          route(':providerName', 'routes/customer/fraud/providers/detail.tsx'),
        ]),
        route('policy', 'routes/customer/fraud/policy.tsx'),
        route(':evalName', 'routes/customer/fraud/detail/index.tsx'),
      ]),
    ]),

    // Activity Hub (old single-page activity kept for backward compatibility)
    route('activity-legacy', 'routes/activity.tsx'),

    // Operations
    route('operations', 'routes/operation/layout.tsx', [
      route('chainsaw-tests', 'routes/operation/chainsaw-tests.tsx'),
      route('activity', 'routes/operation/activity/layout.tsx', [
        index('routes/operation/activity/index.tsx'),
        route('feed', 'routes/operation/activity/feed.tsx'),
        route('events', 'routes/operation/activity/events.tsx'),
        route('audit-logs', 'routes/operation/activity/audit-logs.tsx'),
        route('policies', 'routes/operation/activity/policies/layout.tsx', [
          index('routes/operation/activity/policies/index.tsx'),
          route(':policyName', 'routes/operation/activity/policies/detail.tsx'),
        ]),
      ]),
      route('email-activity', 'routes/operation/email-activity/layout.tsx', [
        index('routes/operation/email-activity/index.tsx'),
        route(':namespace/:emailName', 'routes/operation/email-activity/detail.tsx'),
      ]),
    ]),

    // Marketing
    route('marketing', 'routes/marketing/layout.tsx', [
      route('contacts', 'routes/marketing/contact/layout.tsx', [
        index('routes/marketing/contact/index.tsx'),
        route('create', 'routes/marketing/contact/create.tsx'),
        route(
          ':namespace/:contactName',
          'routes/marketing/contact/detail/layout.tsx',
          { id: 'contact-detail' },
          [
            index('routes/marketing/contact/detail/index.tsx'),
            route('groups', 'routes/marketing/contact/detail/group.tsx'),
          ]
        ),
      ]),
      route('contact-groups', 'routes/marketing/contact-group/layout.tsx', [
        index('routes/marketing/contact-group/index.tsx'),
        route('create', 'routes/marketing/contact-group/create.tsx'),
        route(
          ':contactGroupName',
          'routes/marketing/contact-group/detail/layout.tsx',
          { id: 'contact-group-detail' },
          [
            index('routes/marketing/contact-group/detail/index.tsx'),
            route('members', 'routes/marketing/contact-group/detail/member.tsx'),
          ]
        ),
      ]),
    ]),

    // Admin
    route('admin', 'routes/admin/layout.tsx', [
      route('groups', 'routes/admin/group/layout.tsx', [
        index('routes/admin/group/index.tsx'),
        route(':groupName', 'routes/admin/group/member.tsx', { id: 'group-detail' }),
      ]),
      route('service-catalog', 'routes/admin/service-catalog/layout.tsx', [
        index('routes/admin/service-catalog/index.tsx'),
        route(
          ':name',
          'routes/admin/service-catalog/detail/layout.tsx',
          { id: 'service-catalog-detail' },
          [
            index('routes/admin/service-catalog/detail/index.tsx'),
            route('consumers', 'routes/admin/service-catalog/detail/consumers.tsx'),
            route('approvals', 'routes/admin/service-catalog/detail/approvals.tsx'),
          ]
        ),
      ]),
    ]),

    // Profile
    route('profile', 'routes/profile/layout.tsx', [
      index('routes/profile/index.tsx'),
      route('settings', 'routes/profile/setting.tsx'),
      route('sessions', 'routes/profile/session.tsx'),
    ]),

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
    route('unauthorized', 'routes/error/unauthorized.tsx'),
    route('session-expired', 'routes/error/session-expired.tsx'),
    route('oauth-error', 'routes/error/oauth-error.tsx'),
  ]),

  // Catch-all route for 404 errors - must be last
  route('*', 'routes/error/not-found.tsx'),
] satisfies RouteConfig;
