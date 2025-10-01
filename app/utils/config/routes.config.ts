// Users feature routes
export const userRoutes = {
  list: () => '/customers/users',
  detail: (userId: string) => `/customers/users/${userId}`,
  activity: (userId: string) => `/customers/users/${userId}/activity`,
  organization: (userId: string) => `/customers/users/${userId}/organizations`,
} as const;

// Organizations feature routes
export const orgRoutes = {
  list: () => '/customers/organizations',
  detail: (orgName: string) => `/customers/organizations/${orgName}`,
  project: (orgName: string) => `/customers/organizations/${orgName}/projects`,
  member: (orgName: string) => `/customers/organizations/${orgName}/members`,
  activity: (orgName: string) => `/customers/organizations/${orgName}/activity`,
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
  domain: {
    list: (projectName: string) => `/customers/projects/${projectName}/domains`,
    detail: (projectName: string, domainName: string) =>
      `/customers/projects/${projectName}/domains/${domainName}`,
  },
  httpProxy: {
    list: (projectName: string) => `/customers/projects/${projectName}/http-proxies`,
    detail: (projectName: string, httpProxyName: string) =>
      `/customers/projects/${projectName}/http-proxies/${httpProxyName}`,
  },
  activity: (projectName: string) => `/customers/projects/${projectName}/activity`,
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

// Main routes object
export const routes = {
  dashboard: () => '/',
  activity: () => '/activity',
  emailActivity: () => '/email-activity',
  account: () => '/account',
  login: () => '/login',
  logout: () => '/logout',
  authCallback: () => '/auth/callback',

  sessionExpired: () => '/error/session-expired',
  oauthError: () => '/error/oauth-error',

  users: userRoutes,
  organizations: orgRoutes,
  projects: projectRoutes,
} as const;
