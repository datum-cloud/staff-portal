// Central route builders. Grouped to mirror the Milo nav (nav-config.ts):
// Customers · Marketing · Finance · Operations · Admin, then not-in-menu +
// account + root/auth. Keep each object's paths under its section's base URL.

// ───────────────────────────────── Customers (/customers) ─────────────────────────────────

// Customers → Users
export const userRoutes = {
  list: () => '/customers/users',
  detail: (userId: string) => `/customers/users/${userId}`,
  activity: {
    root: (userId: string) => `/customers/users/${userId}/activity`,
    auditLogs: (userId: string) => `/customers/users/${userId}/activity/audit-logs`,
  },
  organization: (userId: string) => `/customers/users/${userId}/organizations`,
  contacts: (userId: string) => `/customers/users/${userId}/contacts`,
  emailActivity: (userId: string) => `/customers/users/${userId}/email-activity`,
} as const;

// Customers → Organizations
export const orgRoutes = {
  list: () => '/customers/organizations',
  detail: (orgName: string) => `/customers/organizations/${orgName}`,
  project: (orgName: string) => `/customers/organizations/${orgName}/projects`,
  member: (orgName: string) => `/customers/organizations/${orgName}/members`,
  domain: (orgName: string) => `/customers/organizations/${orgName}/domains`,
  edge: (orgName: string) => `/customers/organizations/${orgName}/edges`,
  dns: (orgName: string) => `/customers/organizations/${orgName}/dns`,
  activity: {
    root: (orgName: string) => `/customers/organizations/${orgName}/activity`,
    events: (orgName: string) => `/customers/organizations/${orgName}/activity/events`,
    auditLogs: (orgName: string) => `/customers/organizations/${orgName}/activity/audit-logs`,
  },
  quota: {
    usage: (orgName: string) => `/customers/organizations/${orgName}/quotas/usage`,
    grant: (orgName: string) => `/customers/organizations/${orgName}/quotas/grants`,
  },
  featureFlags: (orgName: string) => `/customers/organizations/${orgName}/feature-flags`,
  usage: (orgName: string) => `/customers/organizations/${orgName}/usage`,
} as const;

// Customers → Projects
export const projectRoutes = {
  list: () => '/customers/projects',
  detail: (projectName: string) => `/customers/projects/${projectName}`,
  quota: {
    usage: (projectName: string) => `/customers/projects/${projectName}/quotas/usage`,
    grant: (projectName: string) => `/customers/projects/${projectName}/quotas/grants`,
  },
  dns: {
    list: (projectName: string) => `/customers/projects/${projectName}/dns`,
    detail: (projectName: string, namespace: string, dnsName: string) =>
      `/customers/projects/${projectName}/dns/${namespace}/${dnsName}`,
  },
  domain: {
    list: (projectName: string) => `/customers/projects/${projectName}/domains`,
    detail: (projectName: string, namespace: string, domainName: string) =>
      `/customers/projects/${projectName}/domains/${namespace}/${domainName}`,
  },
  edge: {
    list: (projectName: string) => `/customers/projects/${projectName}/edges`,
    detail: (projectName: string, edgeName: string) =>
      `/customers/projects/${projectName}/edges/${edgeName}`,
  },
  activity: {
    root: (projectName: string) => `/customers/projects/${projectName}/activity`,
    events: (projectName: string) => `/customers/projects/${projectName}/activity/events`,
    auditLogs: (projectName: string) => `/customers/projects/${projectName}/activity/audit-logs`,
  },
  exportPolicy: {
    list: (projectName: string) => `/customers/projects/${projectName}/export-policies`,
    detail: (projectName: string, exportPolicyName: string) =>
      `/customers/projects/${projectName}/export-policies/${exportPolicyName}`,
  },
  secret: {
    list: (projectName: string) => `/customers/projects/${projectName}/secrets`,
    detail: (projectName: string, secretName: string) =>
      `/customers/projects/${projectName}/secrets/${secretName}`,
  },
} as const;

// Customers → Resources: a tabbed page of global views across all projects.
export const resourceRoutes = {
  root: () => '/customers/resources',
} as const;

// Resources tab: AI Edge (global view across all projects)
export const edgeRoutes = {
  list: () => '/customers/resources/edges',
} as const;

// Resources tab: DNS zones (global view across all projects)
export const dnsRoutes = {
  list: () => '/customers/resources/dns',
} as const;

// Resources tab: Domains (global view across all projects)
export const domainRoutes = {
  list: () => '/customers/resources/domains',
} as const;

// ───────────────────────────────── Marketing (/marketing) ─────────────────────────────────

// Marketing → Contacts
export const contactRoutes = {
  list: () => '/marketing/contacts',
  create: () => '/marketing/contacts/create',
  detail: (namespace: string, contactName: string) =>
    `/marketing/contacts/${namespace}/${contactName}`,
  group: (namespace: string, contactName: string) =>
    `/marketing/contacts/${namespace}/${contactName}/groups`,
} as const;

// Marketing → Contact Groups
export const contactGroupRoutes = {
  list: () => '/marketing/contact-groups',
  create: () => '/marketing/contact-groups/create',
  detail: (contactGroupName: string) => `/marketing/contact-groups/${contactGroupName}`,
  member: (contactGroupName: string) => `/marketing/contact-groups/${contactGroupName}/members`,
} as const;

// ───────────────────────────────── Finance (/finance) ─────────────────────────────────

// Finance → Billing Accounts
export const financeRoutes = {
  billingAccounts: {
    list: () => '/finance/billing-accounts',
    detail: (orgName: string, accountName: string) =>
      `/finance/billing-accounts/${orgName}/${accountName}`,
  },
} as const;

// ───────────────────────────────── Operations (/operations) ─────────────────────────────────

// Operations → Activity
export const activityRoutes = {
  root: () => '/operations/activity',
  feed: () => '/operations/activity/feed',
  events: () => '/operations/activity/events',
  auditLogs: () => '/operations/activity/audit-logs',
  policies: {
    list: () => '/operations/activity/policies',
    detail: (policyName: string) => `/operations/activity/policies/${policyName}`,
    create: () => '/operations/activity/policies/new',
  },
} as const;

// Operations → Email Activity
export const emailActivityRoutes = {
  list: () => '/operations/email-activity',
  detail: (namespace: string, emailName: string) =>
    `/operations/email-activity/${namespace}/${emailName}`,
} as const;

// ───────────────────────────────── Admin (/admin) ─────────────────────────────────

// Admin → Groups
export const groupRoutes = {
  list: () => '/admin/groups',
} as const;

// Admin → Service Catalog
export const serviceCatalogRoutes = {
  root: () => '/admin/service-catalog',
  list: () => '/admin/service-catalog',
  detail: (name: string) => `/admin/service-catalog/${name}`,
  consumers: (name: string) => `/admin/service-catalog/${name}/consumers`,
  approvals: (name: string) => `/admin/service-catalog/${name}/approvals`,
} as const;

// ───────────────────────────────── Not in the menu (hidden) ─────────────────────────────────

// Fraud & Abuse — routes work by URL but the nav entry is hidden for now.
export const fraudRoutes = {
  root: () => '/fraud',
  evaluations: {
    list: () => '/fraud',
    detail: (name: string) => `/fraud/${name}`,
  },
  providers: {
    list: () => '/fraud/providers',
    create: () => '/fraud/providers/create',
    detail: (name: string) => `/fraud/providers/${name}`,
  },
  policy: () => '/fraud/policy',
} as const;

// ───────────────────────────────── Account (/profile) ─────────────────────────────────

export const profileRoutes = {
  settings: () => '/profile/settings',
  sessions: () => '/profile/sessions',
} as const;

// ───────────────────────────────── Aggregate + root/auth ─────────────────────────────────

// Single entry point; the nested keys mirror the sections above. Prefer the
// named `*Routes` exports in code — this object is handy for generic lookups.
export const routes = {
  // Root & auth
  dashboard: () => '/',
  login: () => '/login',
  logout: () => '/logout',
  authCallback: () => '/auth/callback',
  sessionExpired: () => '/error/session-expired',
  oauthError: () => '/error/oauth-error',

  // Customers
  users: userRoutes,
  organizations: orgRoutes,
  projects: projectRoutes,
  resources: resourceRoutes,
  edges: edgeRoutes,
  dns: dnsRoutes,
  domains: domainRoutes,

  // Marketing
  contacts: contactRoutes,
  contactGroups: contactGroupRoutes,

  // Finance
  finance: financeRoutes,

  // Operations
  activity: activityRoutes,
  emailActivity: emailActivityRoutes.list,
  emailActivityDetail: emailActivityRoutes.detail,

  // Admin
  groups: groupRoutes,
  serviceCatalog: serviceCatalogRoutes,

  // Not in the menu
  fraud: fraudRoutes,

  // Account
  profile: profileRoutes,
} as const;
