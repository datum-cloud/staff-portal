/**
 * K8s resource kind (plural) → human-readable label.
 *
 * Used by the error message parser to humanize raw K8s Status messages
 * like `dnszones.dns.networking.miloapis.com "x" not found` into
 * `DNS Zone "x" not found`.
 *
 * Keep keys in lowercase plural form (matching the kind in K8s API paths).
 */
const RESOURCE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  // Organization-level
  organizations: 'Organization',
  users: 'User',
  groups: 'Group',
  roles: 'Role',
  projects: 'Project',
  invitations: 'Invitation',
  members: 'Member',
  policybindings: 'Role',

  // Project-level
  domains: 'Domain',
  dnszones: 'DNS Zone',
  dnsrecords: 'DNS Record',
  dnsrecordsets: 'DNS Record Set',
  dnszonediscoveries: 'DNS Zone Discovery',
  httpproxies: 'Application Load Balancer',
  secrets: 'Secret',
  exportpolicies: 'Export Policy',

  // Contacts
  contacts: 'Contact',
  contactgroups: 'Contact Group',

  // Quota & feature flags
  resourceregistrations: 'Resource Registration',
  resourcegrants: 'Resource Grant',
  allowancebuckets: 'Allowance Bucket',

  // Service catalog
  services: 'Service',
  serviceconfigurations: 'Service Configuration',
  serviceconsumers: 'Service Consumer',
  serviceentitlements: 'Service Entitlement',

  // Fraud
  fraudevaluations: 'Fraud Evaluation',
  fraudpolicies: 'Fraud Policy',
});

export function getResourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource.toLowerCase()] ?? resource;
}
