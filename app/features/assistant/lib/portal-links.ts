/**
 * Maps resource types to their portal URLs and injects portalUrl into resource objects.
 *
 * Claude uses the portalUrl field to construct [label](portalUrl) Markdown links
 * in its responses so operators can navigate directly to referenced resources.
 */

export type PortalResourceType =
  | 'User'
  | 'Organization'
  | 'Project'
  | 'FraudEvaluation'
  | 'Contact'
  | 'ContactGroup'
  | 'Email'
  | 'AuditLogEntry';

/**
 * Returns the portal URL for a given resource type and resource object.
 * Returns null if there is no dedicated portal page for the resource.
 */
export function getPortalUrl(
  resourceType: PortalResourceType,
  resource: Record<string, unknown>
): string | null {
  const metadata = resource.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name as string | undefined;
  const namespace = metadata?.namespace as string | undefined;

  if (!name) return null;

  switch (resourceType) {
    case 'User':
      return `/customers/users/${name}`;
    case 'Organization':
      return `/customers/organizations/${name}`;
    case 'Project':
      return `/customers/projects/${name}`;
    case 'FraudEvaluation':
      return `/fraud/${name}`;
    case 'Contact':
      return namespace ? `/contacts/${namespace}/${name}` : `/contacts/default/${name}`;
    case 'ContactGroup':
      return `/contact-groups/${name}`;
    case 'Email':
      // No dedicated detail route for individual emails
      return `/email-activity`;
    case 'AuditLogEntry':
      // No dedicated detail route for individual audit log entries
      return `/activity/audit-logs`;
    default:
      return null;
  }
}

/**
 * Injects a portalUrl field into a resource object.
 * Returns a new object with portalUrl added; does not mutate the original.
 */
export function injectPortalUrl(
  resource: Record<string, unknown>,
  resourceType: PortalResourceType
): Record<string, unknown> {
  const url = getPortalUrl(resourceType, resource);
  if (url === null) return resource;
  return { ...resource, portalUrl: url };
}
