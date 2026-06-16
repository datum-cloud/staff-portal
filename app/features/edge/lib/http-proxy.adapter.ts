import type { HttpProxy, HttpProxyComplexity, TrafficProtectionMode } from './http-proxy.types';
import type {
  ComDatumapisNetworkingV1AlphaHttpProxy,
  ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy,
} from '@openapi/networking.datumapis.com/v1alpha';

export type { HttpProxyComplexity };

export function classifyHttpProxyComplexity(
  raw: ComDatumapisNetworkingV1AlphaHttpProxy
): HttpProxyComplexity {
  const rules = raw.spec?.rules ?? [];
  const backendRules = rules.filter((r) => r.backends && r.backends.length > 0);

  if (backendRules.length > 1) return 'advanced';

  const backendRule = backendRules[0];
  if (!backendRule) return 'simple';

  if (
    backendRule.backends?.some((b) => {
      const bf = (b as { filters?: unknown[] }).filters;
      return bf && bf.length > 0;
    })
  ) {
    return 'advanced';
  }

  const filters = backendRule.filters ?? [];
  if (filters.length === 0) return 'simple';
  if (filters.length > 1) return 'advanced';

  const filter = filters[0];
  if (!filter.requestHeaderModifier) return 'advanced';

  const rhm = filter.requestHeaderModifier;
  if ((rhm.add && rhm.add.length > 0) || (rhm.remove && rhm.remove.length > 0)) {
    return 'advanced';
  }

  const setHeaders = rhm.set ?? [];
  if (setHeaders.length !== 1) return 'advanced';
  if (setHeaders[0].name.toLowerCase() !== 'host') return 'advanced';

  return 'host-only';
}

export function extractHostHeader(raw: ComDatumapisNetworkingV1AlphaHttpProxy): string {
  const backendRule = raw.spec?.rules?.find((r) => r.backends && r.backends.length > 0);
  const filters = backendRule?.filters ?? [];
  for (const filter of filters) {
    const setHeaders = filter.requestHeaderModifier?.set ?? [];
    const hostEntry = setHeaders.find((h) => h.name.toLowerCase() === 'host');
    if (hostEntry) return hostEntry.value;
  }
  return '';
}

export function parseHtpasswdUsernames(secret: unknown): string[] {
  const encoded = (secret as { data?: { '.htpasswd'?: string } } | null)?.data?.['.htpasswd'];
  if (!encoded) return [];
  try {
    const content = atob(encoded);
    return content
      .split('\n')
      .map((line) => line.split(':')[0])
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function getBasicAuthState(
  securityPolicy: unknown,
  usernames: string[] = []
): {
  enabled: boolean;
  userCount: number;
  usernames: string[];
} {
  if (!securityPolicy) {
    return { enabled: false, userCount: 0, usernames: [] };
  }
  return { enabled: true, userCount: usernames.length, usernames };
}

export function getTrafficProtectionMode(
  raw: ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy | null | undefined
): TrafficProtectionMode | undefined {
  const mode = raw?.spec?.mode;
  if (mode === 'Observe' || mode === 'Enforce' || mode === 'Disabled') return mode;
  return undefined;
}

export function getParanoiaLevels(
  raw: ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy | null | undefined
): { blocking?: number; detection?: number } | undefined {
  const owaspRuleSet = raw?.spec?.ruleSets?.find(
    (rs) => rs.type === 'OWASPCoreRuleSet'
  )?.owaspCoreRuleSet;
  const paranoiaLevels = owaspRuleSet?.paranoiaLevels;
  if (!paranoiaLevels) return undefined;

  const result: { blocking?: number; detection?: number } = {};
  if (
    paranoiaLevels.blocking !== undefined &&
    paranoiaLevels.blocking >= 1 &&
    paranoiaLevels.blocking <= 4
  ) {
    result.blocking = paranoiaLevels.blocking;
  }
  if (
    paranoiaLevels.detection !== undefined &&
    paranoiaLevels.detection >= 1 &&
    paranoiaLevels.detection <= 4
  ) {
    result.detection = paranoiaLevels.detection;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

export function toHttpProxy(
  raw: ComDatumapisNetworkingV1AlphaHttpProxy,
  options?: {
    trafficProtectionMode?: TrafficProtectionMode;
    paranoiaLevels?: { blocking?: number; detection?: number };
    basicAuth?: { enabled: boolean; userCount: number; usernames: string[] };
  }
): HttpProxy {
  const backendRule = raw.spec?.rules?.find((rule) => rule.backends && rule.backends.length > 0);
  const backend = backendRule?.backends?.[0] as
    | { endpoint?: string; tls?: { hostname?: string }; connector?: { name: string } }
    | undefined;

  const origins: string[] = [];
  if (raw.spec?.rules) {
    for (const rule of raw.spec.rules) {
      if (rule.backends && rule.backends.length > 0) {
        for (const backendItem of rule.backends) {
          if (backendItem.endpoint) {
            origins.push(backendItem.endpoint);
          }
        }
      }
    }
  }

  const hasRedirectRule = raw.spec?.rules?.some((rule) => {
    const noBackends = !rule.backends || rule.backends.length === 0;
    if (!noBackends || !rule.filters?.length) return false;
    return rule.filters.some((filter) => {
      const redirect = filter.requestRedirect;
      if (!redirect || redirect.scheme !== 'https') return false;
      const code = Number(redirect.statusCode);
      return code === 301 || code === 302;
    });
  });

  const hostHeader = extractHostHeader(raw);
  const complexity = classifyHttpProxyComplexity(raw);

  const status = raw.status as
    | (ComDatumapisNetworkingV1AlphaHttpProxy['status'] & {
        canonicalHostname?: string;
        hostnameStatuses?: HttpProxy['hostnameStatuses'];
      })
    | undefined;

  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace,
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp ?? '',
    endpoint: backend?.endpoint,
    origins: origins.length > 0 ? origins : undefined,
    hostnames: raw.spec?.hostnames,
    tlsHostname: backend?.tls?.hostname,
    ...(hostHeader && { hostHeader }),
    complexity,
    status: raw.status,
    canonicalHostname: status?.canonicalHostname,
    hostnameStatuses: status?.hostnameStatuses,
    chosenName: raw.metadata?.annotations?.['app.kubernetes.io/name'] ?? '',
    enableHttpRedirect: hasRedirectRule,
    ...(backend?.connector && { connector: backend.connector }),
    ...(options?.trafficProtectionMode !== undefined && {
      trafficProtectionMode: options.trafficProtectionMode,
    }),
    ...(options?.paranoiaLevels !== undefined && {
      paranoiaLevels: options.paranoiaLevels,
    }),
    ...(options?.basicAuth !== undefined && {
      basicAuthEnabled: options.basicAuth.enabled,
      basicAuthUserCount: options.basicAuth.userCount,
      basicAuthUsernames: options.basicAuth.usernames,
    }),
  };
}
