import type {
  ResourceRef,
  Tenant,
  ResourceLinkResolver,
  TenantLinkResolver,
} from '@datum-cloud/activity-ui';

/**
 * Context provided to resource link resolvers.
 * Note: This type is not exported from activity-ui, so we define it locally.
 */
interface ResourceLinkContext {
  tenant?: Tenant;
}

/**
 * Map of resource types to their staff portal route configuration.
 * Only resources with actual detail pages in the staff portal are included.
 *
 * Route patterns:
 * - /customers/projects/:projectName/http-proxies/:httpProxyName
 * - /customers/projects/:projectName/dns/:namespace/:dnsName
 * - /customers/projects/:projectName/domains/:namespace/:domainName
 * - /customers/projects/:projectName/export-policies/:exportPolicyName
 */
interface ResourceRouteConfig {
  path: string;
  includeNamespace: boolean;
  paramName: string;
}

const PROJECT_RESOURCE_ROUTES: Record<string, ResourceRouteConfig> = {
  // networking.datumapis.com
  HTTPProxy: { path: 'http-proxies', includeNamespace: false, paramName: 'httpProxyName' },

  // dns.datumapis.com
  DNSZone: { path: 'dns', includeNamespace: true, paramName: 'dnsName' },

  // domain.datumapis.com
  Domain: { path: 'domains', includeNamespace: true, paramName: 'domainName' },

  // resourcemanager.datumapis.com
  ExportPolicy: { path: 'export-policies', includeNamespace: false, paramName: 'exportPolicyName' },
};

/**
 * Resolve resource references to staff portal routes.
 *
 * IMPORTANT: Only generates links for resources that have actual detail pages
 * in the staff portal. Returns undefined for unknown resources.
 *
 * Currently supported project-scoped resources:
 * - HTTPProxy → /customers/projects/:projectName/http-proxies/:name
 * - DNSZone → /customers/projects/:projectName/dns/:namespace/:name
 * - Domain → /customers/projects/:projectName/domains/:namespace/:name
 * - ExportPolicy → /customers/projects/:projectName/export-policies/:name
 *
 * Requires tenant context to get the project name from the activity.
 * Returns undefined if:
 * - Resource kind is not supported
 * - Tenant is not a project (org-scoped resources don't have detail pages yet)
 * - Required context is missing
 */
export const staffResourceLinkResolver: ResourceLinkResolver = (
  resource: ResourceRef,
  context: ResourceLinkContext = {}
): string | undefined => {
  const { tenant } = context;

  // Only project-scoped resources have detail pages currently
  // Normalize type to lowercase (API returns capitalized types)
  if (tenant?.type.toLowerCase() !== 'project') {
    return undefined;
  }

  // Check if this resource kind has a detail page
  const routeConfig = PROJECT_RESOURCE_ROUTES[resource.kind];
  if (!routeConfig) {
    // Unknown resource type - no detail page exists
    return undefined;
  }

  // Build the route
  let path = `/customers/projects/${tenant.name}/${routeConfig.path}`;

  // Some resources need namespace in the URL (DNS, Domains)
  if (routeConfig.includeNamespace) {
    if (!resource.namespace) {
      // Namespace required but not provided
      return undefined;
    }
    path += `/${resource.namespace}`;
  }

  path += `/${resource.name}`;
  return path;
};

/**
 * Resolve tenant references to staff portal routes.
 *
 * Tenant types in the Activity system:
 * - Organizations and Projects are true multi-tenant scopes
 * - Users are NOT tenants, but activities can be scoped to a user's actions
 * - Platform is the top-level scope (all data across all tenants)
 *
 * Staff portal routes:
 * - Users: /customers/users/:userId (not a tenant, but links to user detail page)
 * - Organizations: /customers/organizations/:orgName
 * - Projects: /customers/projects/:projectName
 *
 * Returns undefined for platform scope (no link needed).
 */
export const staffTenantLinkResolver: TenantLinkResolver = (tenant: Tenant): string | undefined => {
  // Normalize type to lowercase for comparison (API returns capitalized types)
  const tenantType = tenant.type.toLowerCase();

  switch (tenantType) {
    case 'user':
      // Users are not tenants, but we still link to their detail page
      // User routes use ID, not name
      return tenant.id ? `/customers/users/${tenant.id}` : undefined;

    case 'organization':
      return `/customers/organizations/${tenant.name}`;

    case 'project':
      return `/customers/projects/${tenant.name}`;

    case 'platform':
      // Platform scope has no detail page
      return undefined;

    default:
      return undefined;
  }
};
