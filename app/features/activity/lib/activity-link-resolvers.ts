import type {
  ResourceLinkResolver,
  ResourceRef,
  Tenant,
  TenantLinkResolver,
} from '@datum-cloud/activity-ui';

interface ResourceLinkContext {
  tenant?: Tenant;
}

interface ResourceRouteConfig {
  path: string;
  includeNamespace: boolean;
}

const PROJECT_RESOURCE_ROUTES: Record<string, ResourceRouteConfig> = {
  HTTPProxy: { path: 'edges', includeNamespace: false },
  DNSZone: { path: 'dns', includeNamespace: true },
  Domain: { path: 'domains', includeNamespace: true },
  ExportPolicy: { path: 'export-policies', includeNamespace: false },
};

export const staffResourceLinkResolver: ResourceLinkResolver = (
  resource: ResourceRef,
  context: ResourceLinkContext = {}
): string | undefined => {
  const { tenant } = context;
  if (tenant?.type.toLowerCase() !== 'project') return undefined;

  const routeConfig = PROJECT_RESOURCE_ROUTES[resource.kind];
  if (!routeConfig) return undefined;

  let path = `/customers/projects/${tenant.name}/${routeConfig.path}`;
  if (routeConfig.includeNamespace) {
    if (!resource.namespace) return undefined;
    path += `/${resource.namespace}`;
  }
  path += `/${resource.name}`;
  return path;
};

export const staffTenantLinkResolver: TenantLinkResolver = (tenant: Tenant): string | undefined => {
  const tenantType = tenant.type.toLowerCase();
  switch (tenantType) {
    case 'user':
      return tenant.id ? `/customers/users/${tenant.id}` : undefined;
    case 'organization':
      return `/customers/organizations/${tenant.name}`;
    case 'project':
      return `/customers/projects/${tenant.name}`;
    case 'platform':
      return undefined;
    default:
      return undefined;
  }
};
