import { type RouteConfig, index, layout, prefix, route } from '@react-router/dev/routes';

export default [
  // Protected routes with auth.
  // Shell switch: 'layouts/private.layout.tsx' = legacy, 'layouts/milo.layout.tsx' = new Milo shell.
  layout('layouts/milo.layout.tsx', [
    index('routes/dashboard/index.tsx'),

    // Customers
    route('customers', 'routes/customer/layout.tsx', [
      index('routes/customer/index.tsx'),

      // Users
      route('users', 'routes/customer/user/layout.tsx', [
        index('routes/customer/user/index.tsx'),

        route(':userId', 'routes/customer/user/detail/layout.tsx', [
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

        route(':orgName', 'routes/customer/organization/detail/layout.tsx', [
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
        ]),
      ]),

      // Projects
      route('projects', 'routes/customer/project/layout.tsx', [
        index('routes/customer/project/index.tsx'),

        route(':projectName', 'routes/customer/project/detail/layout.tsx', [
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
        ]),
      ]),

      // Resources (Customers → Resources): AI Edge / DNS / Domains tabs.
      route('resources', 'routes/customer/resource/layout.tsx', [
        index('routes/customer/resource/index.tsx'),
        route('edges', 'routes/customer/resource/edge/layout.tsx', [index('routes/customer/resource/edge/index.tsx')]),
        route('dns', 'routes/customer/resource/dns/layout.tsx', [index('routes/customer/resource/dns/index.tsx')]),
        route('domains', 'routes/customer/resource/domain/layout.tsx', [index('routes/customer/resource/domain/index.tsx')]),
      ]),
    ]),

    // Service Catalog
    route('catalog', 'routes/service-catalog/layout.tsx', [
      index('routes/service-catalog/index.tsx'),
      route(':name', 'routes/service-catalog/detail/layout.tsx', [
        index('routes/service-catalog/detail/index.tsx'),
        route('consumers', 'routes/service-catalog/detail/consumers.tsx'),
        route('approvals', 'routes/service-catalog/detail/approvals.tsx'),
      ]),
    ]),

    // Fraud & Abuse
    route('fraud', 'routes/fraud/layout.tsx', [
      index('routes/fraud/index.tsx'),
      route('providers', 'routes/fraud/providers/layout.tsx', [
        index('routes/fraud/providers/index.tsx'),
        route('create', 'routes/fraud/providers/create.tsx'),
        route(':providerName', 'routes/fraud/providers/detail.tsx'),
      ]),
      route('policy', 'routes/fraud/policy.tsx'),
      route(':evalName', 'routes/fraud/detail/index.tsx'),
    ]),

    // Activity Hub (old single-page activity kept for backward compatibility)
    route('activity-legacy', 'routes/activity.tsx'),

    // Activity Hub (new tabbed interface)
    route('activity', 'routes/activity-hub/layout.tsx', [
      index('routes/activity-hub/index.tsx'),
      route('feed', 'routes/activity-hub/feed.tsx'),
      route('events', 'routes/activity-hub/events.tsx'),
      route('audit-logs', 'routes/activity-hub/audit-logs.tsx'),
      route('policies', 'routes/activity-hub/policies/layout.tsx', [
        index('routes/activity-hub/policies/index.tsx'),
        route(':policyName', 'routes/activity-hub/policies/detail.tsx'),
      ]),
    ]),

    // Contacts
    route('contacts', 'routes/contact/layout.tsx', [
      index('routes/contact/index.tsx'),
      route('create', 'routes/contact/create.tsx'),
      route(':namespace/:contactName', 'routes/contact/detail/layout.tsx', [
        index('routes/contact/detail/index.tsx'),
        route('groups', 'routes/contact/detail/group.tsx'),
      ]),
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

    // Finance
    route('finance', 'routes/finance/layout.tsx', [
      route('billing-accounts', 'routes/finance/billing-account/layout.tsx', [
        index('routes/finance/billing-account/index.tsx'),
        route(':orgName/:accountName', 'routes/finance/billing-account/detail/layout.tsx', [
          index('routes/finance/billing-account/detail/index.tsx'),
        ]),
      ]),
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
    route('unauthorized', 'routes/error/unauthorized.tsx'),
    route('session-expired', 'routes/error/session-expired.tsx'),
    route('oauth-error', 'routes/error/oauth-error.tsx'),
  ]),

  // Catch-all route for 404 errors - must be last
  route('*', 'routes/error/not-found.tsx'),
] satisfies RouteConfig;
