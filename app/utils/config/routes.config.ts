// Users feature routes
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

// Organizations feature routes
export const orgRoutes = {
  list: () => '/customers/organizations',
  detail: (orgName: string) => `/customers/organizations/${orgName}`,
  project: (orgName: string) => `/customers/organizations/${orgName}/projects`,
  member: (orgName: string) => `/customers/organizations/${orgName}/members`,
  activity: {
    root: (orgName: string) => `/customers/organizations/${orgName}/activity`,
    events: (orgName: string) => `/customers/organizations/${orgName}/activity/events`,
    auditLogs: (orgName: string) => `/customers/organizations/${orgName}/activity/audit-logs`,
  },
  quota: {
    usage: (orgName: string) => `/customers/organizations/${orgName}/quotas/usage`,
    grant: (orgName: string) => `/customers/organizations/${orgName}/quotas/grants`,
  },
} as const;

// Projects feature routes
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

// Groups feature routes
export const groupRoutes = {
  list: () => '/groups',
} as const;

// Contacts feature routes
export const contactRoutes = {
  list: () => '/contacts',
  create: () => '/contacts/create',
  detail: (namespace: string, contactName: string) => `/contacts/${namespace}/${contactName}`,
  group: (namespace: string, contactName: string) => `/contacts/${namespace}/${contactName}/groups`,
} as const;

export const contactGroupRoutes = {
  list: () => '/contact-groups',
  create: () => '/contact-groups/create',
  detail: (contactGroupName: string) => `/contact-groups/${contactGroupName}`,
  member: (contactGroupName: string) => `/contact-groups/${contactGroupName}/members`,
} as const;

// Fraud feature routes
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

// Activity feature routes
export const activityRoutes = {
  root: () => '/activity',
  feed: () => '/activity/feed',
  events: () => '/activity/events',
  auditLogs: () => '/activity/audit-logs',
  policies: {
    list: () => '/activity/policies',
    detail: (policyName: string) => `/activity/policies/${policyName}`,
    create: () => '/activity/policies/new',
  },
} as const;

// Profile feature routes
export const profileRoutes = {
  settings: () => '/profile/settings',
  sessions: () => '/profile/sessions',
} as const;

// Main routes object
export const routes = {
  dashboard: () => '/',
  emailActivity: () => '/email-activity',
  emailActivityDetail: (namespace: string, emailName: string) =>
    `/email-activity/${namespace}/${emailName}`,
  login: () => '/login',
  logout: () => '/logout',
  authCallback: () => '/auth/callback',

  sessionExpired: () => '/error/session-expired',
  oauthError: () => '/error/oauth-error',

  users: userRoutes,
  organizations: orgRoutes,
  projects: projectRoutes,
  contacts: contactRoutes,
  groups: groupRoutes,
  profile: profileRoutes,
  contactGroups: contactGroupRoutes,
  fraud: fraudRoutes,
  activity: activityRoutes,
} as const;
