import {
  backendTargets,
  extractBackendRules,
  extractTrafficSettings,
  formatDuration,
  shareLabels,
} from './http-proxy.backends';
import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@openapi/networking.datumapis.com/v1alpha';
import { describe, expect, it } from 'bun:test';

function proxy(spec: Record<string, unknown>): ComDatumapisNetworkingV1AlphaHttpProxy {
  return { spec } as unknown as ComDatumapisNetworkingV1AlphaHttpProxy;
}

const redirectRule = {
  matches: [{ path: { type: 'PathPrefix', value: '/' } }],
  filters: [{ type: 'RequestRedirect', requestRedirect: { scheme: 'https', statusCode: 301 } }],
};

describe('extractBackendRules', () => {
  it('weights every backend kind and skips rules without backends', () => {
    const rules = extractBackendRules(
      proxy({
        rules: [
          redirectRule,
          {
            matches: [{ path: { type: 'PathPrefix', value: '/' } }],
            backends: [
              { endpoint: 'https://a.example.com', weight: 3, tls: { hostname: 'a.internal' } },
              { networkService: { name: 'storefront', port: 'http' } },
              { instance: { name: 'vm-1', port: 8080 }, weight: 0 },
            ],
          },
        ],
      })
    );

    expect(rules).toHaveLength(1);
    const [a, ns, vm] = rules[0].backends;
    expect(rules[0].matchLabel).toBe('/');
    expect(a).toMatchObject({
      kind: 'endpoint',
      target: 'https://a.example.com',
      weight: 3,
      shareLabel: '75%',
      details: ['TLS hostname a.internal'],
    });
    expect(ns).toMatchObject({ kind: 'networkService', target: 'storefront:http', weight: 1 });
    expect(ns.shareLabel).toBe('25%');
    expect(vm).toMatchObject({ kind: 'instance', target: 'vm-1:8080', drained: true });
  });

  it('labels a connector backend with its connector', () => {
    const [rule] = extractBackendRules(
      proxy({
        rules: [
          { backends: [{ endpoint: 'http://localhost:3000', connector: { name: 'laptop' } }] },
        ],
      })
    );
    expect(rule.backends[0]).toMatchObject({
      kind: 'connector',
      details: ['via connector laptop'],
    });
  });
});

describe('extractTrafficSettings', () => {
  it('shows Envoy Gateway’s default when loadBalancer is unset', () => {
    expect(extractTrafficSettings(proxy({ rules: [] }))).toEqual({
      loadBalancerType: 'LeastRequest',
      loadBalancerExplicit: false,
    });
  });

  it('reads consistent hashing and fills passive defaults', () => {
    const settings = extractTrafficSettings(
      proxy({
        loadBalancer: {
          type: 'ConsistentHash',
          consistentHash: { type: 'Header', header: 'x-user-id' },
        },
        healthCheck: { passive: { consecutive5xxErrors: 3 } },
      })
    );
    expect(settings).toEqual({
      loadBalancerType: 'ConsistentHash',
      loadBalancerExplicit: true,
      hashOn: 'Header x-user-id',
      passive: { consecutive5xxErrors: 3, baseEjectionTime: '30s', maxEjectionPercent: 50 },
    });
  });

  it('treats an empty healthCheck as off', () => {
    expect(extractTrafficSettings(proxy({ healthCheck: {} })).passive).toBeUndefined();
  });
});

describe('backendTargets', () => {
  it('lists every kind, not just endpoint URLs', () => {
    expect(
      backendTargets(
        proxy({
          rules: [
            { backends: [{ endpoint: 'https://a.example.com' }] },
            { backends: [{ networkService: { name: 'api', port: 'http' } }] },
          ],
        })
      )
    ).toEqual(['https://a.example.com', 'api:http']);
  });
});

describe('shareLabels', () => {
  it('rounds to a 100% total', () => {
    expect(shareLabels([37.5, 62.5])).toEqual(['38%', '62%']);
    expect(shareLabels([99.5, 0.5])).toEqual(['100%', '<1%']);
  });
});

describe('formatDuration', () => {
  it('spells out simple durations', () => {
    expect(formatDuration('30s')).toBe('30 seconds');
    expect(formatDuration('1m')).toBe('1 minute');
    expect(formatDuration('1m30s')).toBe('1m30s');
  });
});
