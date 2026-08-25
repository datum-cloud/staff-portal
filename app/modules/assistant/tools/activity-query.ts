const WRITE_VERBS = ['create', 'update', 'patch', 'delete', 'deletecollection'] as const;
const ERROR_MAX_CHARS = 200;

const RESOURCE_LABELS: Record<string, string> = {
  dnszones: 'DNS zone',
  dnsrecords: 'DNS record',
  dnsrecordsets: 'DNS record set',
  httpproxies: 'HTTP proxy',
  domains: 'Domain',
  projects: 'Project',
  users: 'User',
  groups: 'Group',
  roles: 'Role',
  secrets: 'Secret',
  invitations: 'Invitation',
  members: 'Member',
  namespaces: 'Namespace',
  organizations: 'Organization',
  dnszonediscoveries: 'DNS zone discovery',
  exportpolicies: 'Export policy',
  billingaccounts: 'Billing account',
  paymentmethods: 'Payment method',
  billingaccountbindings: 'Billing binding',
};

const RESOURCE_URLS: Record<string, (name: string) => string> = {
  users: (name) => `/customers/users/${encodeURIComponent(name)}`,
  organizations: (name) => `/customers/organizations/${encodeURIComponent(name)}`,
  projects: (name) => `/customers/projects/${encodeURIComponent(name)}`,
};

export type ActivityFilterInput = {
  user?: string;
  resourceType?: string;
  apiGroup?: string;
  namespace?: string;
  resourceName?: string;
  verb?: string;
  includeReads?: boolean;
  includeSystem?: boolean;
};

export type ShapedActivityEvent = {
  time?: string;
  actor?: string;
  verb?: string;
  resource?: string;
  name?: string;
  namespace?: string;
  status?: number;
  error?: string;
  url?: string;
  email?: string;
  displayName?: string;
  hostname?: string;
};

export function escapeCelString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function buildActivityFilter(input: ActivityFilterInput): string {
  const conditions: string[] = [
    `objectRef.apiGroup != 'activity.miloapis.com'`,
    `objectRef.apiGroup != 'authorization.k8s.io'`,
    `objectRef.apiGroup != 'authentication.k8s.io'`,
  ];

  if (!input.includeReads && !input.verb) {
    conditions.push(`verb in [${WRITE_VERBS.map((v) => `'${v}'`).join(', ')}]`);
  }
  if (!input.includeSystem) {
    conditions.push(`user.username.startsWith('system:') == false`);
  }
  if (input.user) conditions.push(`user.username == '${escapeCelString(input.user)}'`);
  if (input.resourceType) {
    conditions.push(`objectRef.resource == '${escapeCelString(input.resourceType)}'`);
  }
  if (input.apiGroup) {
    conditions.push(`objectRef.apiGroup == '${escapeCelString(input.apiGroup)}'`);
  }
  if (input.namespace) {
    conditions.push(`objectRef.namespace == '${escapeCelString(input.namespace)}'`);
  }
  if (input.resourceName) {
    conditions.push(`objectRef.name == '${escapeCelString(input.resourceName)}'`);
  }
  if (input.verb) conditions.push(`verb == '${escapeCelString(input.verb)}'`);

  return conditions.join(' && ');
}

function humanizeResource(resource?: string): string | undefined {
  if (!resource) return undefined;
  if (RESOURCE_LABELS[resource]) return RESOURCE_LABELS[resource];
  const singular = resource.replace(/s$/, '');
  const words = singular.replace(/([A-Z])/g, ' $1').split(/[\s-]+/);
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

function eventTime(event: Record<string, unknown>): string | undefined {
  const raw = event.requestReceivedTimestamp ?? event.stageTimestamp;
  if (typeof raw === 'string' && raw) return raw;
  if (raw && typeof raw === 'object' && 'seconds' in raw) {
    const seconds = Number((raw as { seconds?: number }).seconds);
    if (!Number.isNaN(seconds)) return new Date(seconds * 1000).toISOString();
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, any> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const obj = value as Record<string, any>;
  if (typeof obj.Raw === 'string') {
    try {
      const parsed = JSON.parse(obj.Raw);
      return parsed && typeof parsed === 'object' ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return obj;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

export function shapeAuditEvent(event: Record<string, any>): ShapedActivityEvent {
  const resourceType = event.objectRef?.resource as string | undefined;
  const name = event.objectRef?.name as string | undefined;
  const status = event.responseStatus?.code as number | undefined;
  const message = event.responseStatus?.message as string | undefined;
  const shaped: ShapedActivityEvent = {
    time: eventTime(event),
    actor: event.user?.username,
    verb: event.verb,
    resource: humanizeResource(resourceType),
    name,
    namespace: event.objectRef?.namespace,
  };

  if (typeof status === 'number') shaped.status = status;
  if (message && status && status >= 400) shaped.error = truncate(message, ERROR_MAX_CHARS);
  if (name && resourceType && RESOURCE_URLS[resourceType]) {
    shaped.url = RESOURCE_URLS[resourceType](name);
  }

  if (event.verb === 'create') {
    const created = asRecord(event.responseObject) ?? asRecord(event.requestObject);
    const email = created?.spec?.email;
    const displayName =
      created?.metadata?.annotations?.['kubernetes.io/display-name'] ||
      [created?.spec?.givenName, created?.spec?.familyName].filter(Boolean).join(' ') ||
      undefined;
    const hostname = created?.spec?.domainName ?? created?.spec?.domain ?? created?.spec?.hostname;
    if (typeof email === 'string' && email) shaped.email = email;
    if (typeof displayName === 'string' && displayName) shaped.displayName = displayName;
    if (typeof hostname === 'string' && hostname) shaped.hostname = hostname;
  }

  return shaped;
}
