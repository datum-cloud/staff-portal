// Users feature routes
export const userRoutes = {
  list: () => '/customers/users',
  detail: (userId: string) => `/customers/users/${userId}`,
  activity: (userId: string) => `/customers/users/${userId}/activity`,
} as const;

// Organizations feature routes
export const orgRoutes = {
  list: () => '/customers/organizations',
  detail: (orgName: string) => `/customers/organizations/${orgName}`,
  projects: (orgName: string) => `/customers/organizations/${orgName}/projects`,
  activity: (orgName: string) => `/customers/organizations/${orgName}/activity`,
} as const;

// Projects feature routes
export const projectRoutes = {
  list: () => '/customers/projects',
  detail: (projectName: string) => `/customers/projects/${projectName}`,
  httpProxy: {
    list: (projectName: string) => `/customers/projects/${projectName}/http-proxies`,
    detail: (projectName: string, httpProxyName: string) =>
      `/customers/projects/${projectName}/http-proxies/${httpProxyName}`,
  },
  activity: (projectName: string) => `/customers/projects/${projectName}/activity`,
} as const;

// Main routes object
export const routes = {
  dashboard: () => '/',
  activity: () => '/activity',
  login: () => '/login',
  logout: () => '/logout',
  authCallback: () => '/auth/callback',
  setTheme: () => '/action/set-theme',
  sessionExpired: () => '/error/session-expired',
  oauthError: () => '/error/oauth-error',

  users: userRoutes,
  organizations: orgRoutes,
  projects: projectRoutes,
} as const;
