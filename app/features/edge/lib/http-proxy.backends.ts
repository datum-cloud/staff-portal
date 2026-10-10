import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@openapi/networking.datumapis.com/v1alpha';

/*
 * The generated networking types predate weighted backends, network service and
 * instance backends, `spec.loadBalancer` and `spec.healthCheck`, so this module
 * reads those fields through the shapes below (from NSO's httpproxy_types.go).
 */

export type HttpProxyBackendKind = 'endpoint' | 'connector' | 'networkService' | 'instance';

type RawBackend = {
  endpoint?: string;
  connector?: { name?: string };
  instance?: { name?: string; port?: number };
  networkService?: { name?: string; port?: string };
  tls?: { hostname?: string };
  weight?: number;
  filters?: unknown[];
};

type RawRule = NonNullable<
  NonNullable<ComDatumapisNetworkingV1AlphaHttpProxy['spec']>['rules']
>[number];

type RawLoadBalancer = {
  type?: HttpProxyLoadBalancerType;
  consistentHash?: { type?: 'SourceIP' | 'Header'; header?: string };
};

type RawHealthCheck = {
  passive?: {
    consecutive5xxErrors?: number;
    baseEjectionTime?: string;
    maxEjectionPercent?: number;
  };
};

export type HttpProxyLoadBalancerType = 'RoundRobin' | 'Random' | 'LeastRequest' | 'ConsistentHash';

/** `weight` when a backend omits it (the API default). */
export const HTTP_PROXY_DEFAULT_WEIGHT = 1;

/** API defaults the operator applies when a passive field is unset. */
export const PASSIVE_HEALTH_CHECK_DEFAULTS = {
  consecutive5xxErrors: 5,
  baseEjectionTime: '30s',
  maxEjectionPercent: 50,
} as const;

/**
 * What an unset `spec.loadBalancer` does: the operator attaches no policy and
 * Envoy Gateway falls back to least request. The cloud portal shows the same.
 */
export const DEFAULT_LOAD_BALANCER_TYPE: HttpProxyLoadBalancerType = 'LeastRequest';

const LOAD_BALANCER_LABELS: Record<HttpProxyLoadBalancerType, string> = {
  RoundRobin: 'Round robin',
  Random: 'Random',
  LeastRequest: 'Least request',
  ConsistentHash: 'Consistent hash',
};

const KIND_LABELS: Record<HttpProxyBackendKind, string> = {
  endpoint: 'URL',
  connector: 'Connector',
  networkService: 'Network service',
  instance: 'Instance',
};

export type HttpProxyBackendRow = {
  kind: HttpProxyBackendKind;
  kindLabel: string;
  /** The endpoint URL, or the referenced resource. */
  target: string;
  /** Port, connector or TLS detail shown under the target. */
  details: string[];
  weight: number;
  /** Share of the rule's traffic, 0–100. */
  share: number;
  /** `share` rounded with the rest of the rule so the labels total 100%. */
  shareLabel: string;
  /** Weight 0: in the pool but sent no traffic. */
  drained: boolean;
  hasFilters: boolean;
};

export type HttpProxyBackendRule = {
  /** The rule's name, when set. */
  name?: string;
  /** "/api", or every match when there's more than one. */
  matchLabel: string;
  backends: HttpProxyBackendRow[];
};

export type HttpProxyPassiveHealthCheck = {
  consecutive5xxErrors: number;
  baseEjectionTime: string;
  maxEjectionPercent: number;
};

export type HttpProxyTrafficSettings = {
  loadBalancerType: HttpProxyLoadBalancerType;
  /** False when `spec.loadBalancer` is unset and Envoy's default applies. */
  loadBalancerExplicit: boolean;
  /** "Source IP" or "Header x-user-id" for consistent hashing. */
  hashOn?: string;
  /** Passive health checks with API defaults filled in; undefined when off. */
  passive?: HttpProxyPassiveHealthCheck;
};

export function backendKind(backend: RawBackend): HttpProxyBackendKind {
  if (backend.instance) return 'instance';
  if (backend.networkService) return 'networkService';
  if (backend.connector) return 'connector';
  return 'endpoint';
}

/** One-line label for a backend, for lists and search. */
export function formatBackendTarget(backend: RawBackend): string {
  switch (backendKind(backend)) {
    case 'networkService':
      return `${backend.networkService?.name ?? '—'}:${backend.networkService?.port ?? '—'}`;
    case 'instance':
      return `${backend.instance?.name ?? '—'}:${backend.instance?.port ?? '—'}`;
    default:
      return backend.endpoint ?? '';
  }
}

/** Every backend target across every rule, for list columns and search. */
export function backendTargets(raw: ComDatumapisNetworkingV1AlphaHttpProxy): string[] {
  return (raw.spec?.rules ?? []).flatMap((rule) =>
    ((rule.backends ?? []) as RawBackend[]).map(formatBackendTarget).filter(Boolean)
  );
}

function backendDetails(backend: RawBackend, kind: HttpProxyBackendKind): string[] {
  const details: string[] = [];
  if (kind === 'connector' && backend.connector?.name) {
    details.push(`via connector ${backend.connector.name}`);
  }
  if (kind === 'networkService') details.push('Galactic VPC');
  if (kind === 'instance') details.push('Galactic VPC');
  if (backend.tls?.hostname) details.push(`TLS hostname ${backend.tls.hostname}`);
  return details;
}

/** Shares by weight. When every weight is 0 nothing is routable, so all shares are 0. */
export function weightShares(weights: number[]): number[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => (total > 0 ? (weight / total) * 100 : 0));
}

/**
 * Whole-percent labels that add up to 100% (largest-remainder rounding). A
 * share that still rounds to 0 shows as "<1%" so it doesn't read as drained.
 */
export function shareLabels(shares: number[]): string[] {
  const floors = shares.map((share) => Math.floor(share));
  const total = shares.reduce((sum, share) => sum + share, 0);
  let leftover = total > 0 ? 100 - floors.reduce((sum, n) => sum + n, 0) : 0;
  const byRemainder = shares
    .map((share, index) => ({ index, remainder: share - floors[index] }))
    .sort((a, b) => b.remainder - a.remainder);
  const rounded = [...floors];
  for (const { index } of byRemainder) {
    if (leftover <= 0) break;
    rounded[index] += 1;
    leftover -= 1;
  }
  return rounded.map((value, index) => (value === 0 && shares[index] > 0 ? '<1%' : `${value}%`));
}

function matchLabel(rule: RawRule): string {
  const matches = rule.matches ?? [];
  if (matches.length === 0) return '/';
  return matches
    .map((match) => {
      const parts = [match.path?.value ?? '/'];
      if (match.method) parts.unshift(match.method);
      if (match.headers?.length) parts.push(`+${match.headers.length} header`);
      if (match.queryParams?.length) parts.push(`+${match.queryParams.length} query`);
      return parts.join(' ');
    })
    .join(', ');
}

/** The rules that forward to backends, each with its weighted backends. */
export function extractBackendRules(
  raw: ComDatumapisNetworkingV1AlphaHttpProxy
): HttpProxyBackendRule[] {
  return (raw.spec?.rules ?? [])
    .filter((rule) => rule.backends && rule.backends.length > 0)
    .map((rule) => {
      const backends = (rule.backends ?? []) as RawBackend[];
      const weights = backends.map((b) => b.weight ?? HTTP_PROXY_DEFAULT_WEIGHT);
      const shares = weightShares(weights);
      const labels = shareLabels(shares);
      return {
        name: rule.name,
        matchLabel: matchLabel(rule),
        backends: backends.map((backend, index) => {
          const kind = backendKind(backend);
          return {
            kind,
            kindLabel: KIND_LABELS[kind],
            target: formatBackendTarget(backend) || '—',
            details: backendDetails(backend, kind),
            weight: weights[index],
            share: shares[index],
            shareLabel: labels[index],
            drained: weights[index] === 0,
            hasFilters: (backend.filters?.length ?? 0) > 0,
          };
        }),
      };
    });
}

export function extractTrafficSettings(
  raw: ComDatumapisNetworkingV1AlphaHttpProxy
): HttpProxyTrafficSettings {
  const spec = raw.spec as
    | { loadBalancer?: RawLoadBalancer; healthCheck?: RawHealthCheck }
    | undefined;
  const lb = spec?.loadBalancer;
  const passive = spec?.healthCheck?.passive;

  let hashOn: string | undefined;
  if (lb?.type === 'ConsistentHash') {
    hashOn =
      lb.consistentHash?.type === 'Header'
        ? `Header ${lb.consistentHash.header ?? ''}`
        : 'Source IP';
  }

  return {
    loadBalancerType: lb?.type ?? DEFAULT_LOAD_BALANCER_TYPE,
    loadBalancerExplicit: !!lb?.type,
    ...(hashOn && { hashOn }),
    ...(passive && {
      passive: {
        consecutive5xxErrors:
          passive.consecutive5xxErrors ?? PASSIVE_HEALTH_CHECK_DEFAULTS.consecutive5xxErrors,
        baseEjectionTime:
          passive.baseEjectionTime ?? PASSIVE_HEALTH_CHECK_DEFAULTS.baseEjectionTime,
        maxEjectionPercent:
          passive.maxEjectionPercent ?? PASSIVE_HEALTH_CHECK_DEFAULTS.maxEjectionPercent,
      },
    }),
  };
}

export function loadBalancerLabel(type: HttpProxyLoadBalancerType): string {
  return LOAD_BALANCER_LABELS[type] ?? type;
}

const DURATION_UNITS: Record<string, string> = { ms: 'ms', s: 'second', m: 'minute', h: 'hour' };

/** "30s" → "30 seconds". Falls back to the raw value for compound durations. */
export function formatDuration(value: string): string {
  const match = value.match(/^(\d+)(ms|s|m|h)$/);
  if (!match) return value;
  const amount = Number(match[1]);
  const unit = DURATION_UNITS[match[2]];
  if (unit === 'ms') return `${amount} ms`;
  return `${amount} ${unit}${amount === 1 ? '' : 's'}`;
}
