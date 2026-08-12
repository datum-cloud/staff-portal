/// <reference types="bun-types/test" />
import { KubeClient, resolveKubeContext, parseKubeconfig } from './kubeconfig';
import { PlatformSource, specFromProviderPortalPlugin } from './platform-source';
import { PluginRegistry } from './registry';
import { describe, expect, mock, test } from 'bun:test';

const VALID_MANIFEST = {
  name: 'workloads.staff-portal.datumapis.com',
  version: '0.2.0',
  sdk: { name: '@datum-cloud/portal-plugin-sdk', range: '^1.0.0' },
  remoteEntry: 'remoteEntry.js',
  exposedModules: {},
  extensions: [
    {
      type: 'portal.resource/platform',
      properties: {
        id: 'compute-workload',
        type: 'workload',
        label: 'Workload',
        icon: 'box',
        searchTarget: { group: 'compute.datumapis.com', version: 'v1alpha', kind: 'Workload' },
      },
    },
  ],
};

const NO_AUTH_KUBECONFIG = `
apiVersion: v1
kind: Config
current-context: milo
clusters:
- name: c
  cluster:
    server: http://127.0.0.1:8080
contexts:
- name: milo
  context: { cluster: c, user: u }
users:
- name: u
  user: {}
`;

function providerPortalPluginResource(
  spec: Record<string, unknown> = {},
  meta: { generation?: number; resourceVersion?: string } = {},

  status?: { conditions?: any[] }
) {
  return {
    metadata: {
      name: 'compute-datumapis-com',
      generation: meta.generation ?? 1,
      resourceVersion: meta.resourceVersion ?? '100',
    },
    spec: {
      slug: 'compute',
      displayName: 'Compute',
      deprecated: false,
      suspend: false,
      assets: { baseURL: 'http://plugin.example.com' },
      ...spec,
    },
    ...(status ? { status } : {}),
  };
}

/** The status.conditions block the source writes for the valid fixture (Ready). */
function readyConditions(patchBody: string): any[] {
  return JSON.parse(patchBody).status.conditions;
}

/** A registry whose manifest pipeline always resolves the valid fixture. */
function makeRegistry() {
  const fetchImpl = mock(async () => new Response(JSON.stringify(VALID_MANIFEST), { status: 200 }));
  const registry = new PluginRegistry({ fetchImpl: fetchImpl as unknown as typeof fetch });
  return { registry, fetchImpl };
}

/** A KubeClient whose requests (status patches) succeed. */
function makeClient() {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = mock(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response('{}', { status: 200 });
  });
  const client = new KubeClient(resolveKubeContext(parseKubeconfig(NO_AUTH_KUBECONFIG)), {
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { client, calls };
}

const silentLogger = { warn: mock(() => {}), info: mock(() => {}), error: mock(() => {}) };

describe('specFromProviderPortalPlugin', () => {
  test('maps a resource spec with defaults applied', () => {
    const spec = specFromProviderPortalPlugin(providerPortalPluginResource(), silentLogger);
    expect(spec).not.toBeNull();
    expect(spec!.slug).toBe('compute');
    expect(spec!.assets.manifestPath).toBe('/plugin-manifest.json');
    // No visibility block on ProviderPortalPlugin — always defaulted to None.
    expect(spec!.visibility.entitlement).toBe('None');
  });

  test('returns null when slug or assets.baseURL is missing', () => {
    expect(specFromProviderPortalPlugin({ spec: { slug: 'x' } }, silentLogger)).toBeNull();
    expect(
      specFromProviderPortalPlugin({ spec: { assets: { baseURL: 'http://x' } } }, silentLogger)
    ).toBeNull();
  });

  test('reads assets.caBundle as a flat string (no live ref resolution)', () => {
    const spec = specFromProviderPortalPlugin(
      providerPortalPluginResource({
        assets: {
          baseURL: 'https://plugin.example.com',
          caBundle: '-----BEGIN CERTIFICATE-----\nfake\n',
        },
      }),
      silentLogger
    );
    expect(spec?.assets.caBundle).toBe('-----BEGIN CERTIFICATE-----\nfake\n');
  });
});

describe('PlatformSource.applyWatchEvent', () => {
  test('ADDED reduces into a servable registry entry', async () => {
    const { registry } = makeRegistry();
    const { client } = makeClient();
    const source = new PlatformSource(registry, client, { logger: silentLogger });

    await source.applyWatchEvent({ type: 'ADDED', object: providerPortalPluginResource() });

    const plugin = registry.getPlugin('compute');
    expect(plugin).toBeDefined();
    expect(plugin?.source).toBe('platform');
    expect(plugin?.devMode).toBe(false);
    expect(plugin?.manifest?.version).toBe('0.2.0');
  });

  test('best-effort PATCHes the status subresource', async () => {
    const { registry } = makeRegistry();
    const { client, calls } = makeClient();
    const source = new PlatformSource(registry, client, { logger: silentLogger });

    await source.applyWatchEvent({ type: 'ADDED', object: providerPortalPluginResource() });

    const patch = calls.find((c) =>
      c.url.endsWith('/providerportalplugins/compute-datumapis-com/status')
    );
    expect(patch).toBeDefined();
    expect(patch?.init.method).toBe('PATCH');
    const body = JSON.parse(patch!.init.body as string);
    expect(
      body.status.conditions.some((cond: any) => cond.type === 'Ready' && cond.status === 'True')
    ).toBe(true);
  });

  test('spec-only MODIFIED hot-applies the new spec (displayName change)', async () => {
    const { registry } = makeRegistry();
    const { client } = makeClient();
    const source = new PlatformSource(registry, client, { logger: silentLogger });

    await source.applyWatchEvent({ type: 'ADDED', object: providerPortalPluginResource() });
    expect(registry.getPlugin('compute')?.spec.displayName).toBe('Compute');

    await source.applyWatchEvent({
      type: 'MODIFIED',
      object: providerPortalPluginResource(
        { displayName: 'Compute (renamed)' },
        { generation: 2, resourceVersion: '200' }
      ),
    });

    expect(registry.getPlugin('compute')?.spec.displayName).toBe('Compute (renamed)');
  });

  test('suspend kill switch takes effect within one watch event, and un-suspend restores', async () => {
    const { registry } = makeRegistry();
    const { client } = makeClient();
    const source = new PlatformSource(registry, client, { logger: silentLogger });

    await source.applyWatchEvent({ type: 'ADDED', object: providerPortalPluginResource() });
    expect(registry.getPlugin('compute')).toBeDefined();

    await source.applyWatchEvent({
      type: 'MODIFIED',
      object: providerPortalPluginResource(
        { suspend: true },
        { generation: 2, resourceVersion: '200' }
      ),
    });
    expect(registry.getPlugin('compute')).toBeUndefined();

    await source.applyWatchEvent({
      type: 'MODIFIED',
      object: providerPortalPluginResource(
        { suspend: false },
        { generation: 3, resourceVersion: '300' }
      ),
    });
    expect(registry.getPlugin('compute')).toBeDefined();
  });

  test('ignores a status-only MODIFIED (spec unchanged) — breaks the reconcile feedback loop', async () => {
    const { registry, fetchImpl } = makeRegistry();
    const { client, calls } = makeClient();
    const source = new PlatformSource(registry, client, { logger: silentLogger });

    await source.applyWatchEvent({ type: 'ADDED', object: providerPortalPluginResource() });
    const fetchesAfterAdd = fetchImpl.mock.calls.length;
    const patchesAfterAdd = calls.filter((c) => c.init.method === 'PATCH').length;
    expect(patchesAfterAdd).toBe(1);

    const writtenConditions = readyConditions(
      calls.find((c) => c.init.method === 'PATCH')!.init.body as string
    );
    await source.applyWatchEvent({
      type: 'MODIFIED',
      object: providerPortalPluginResource(
        {},
        { generation: 1, resourceVersion: '101' },
        { conditions: writtenConditions }
      ),
    });

    expect(fetchImpl.mock.calls.length).toBe(fetchesAfterAdd);
    expect(calls.filter((c) => c.init.method === 'PATCH').length).toBe(patchesAfterAdd);
  });

  test('applies a spec change even when metadata.generation does NOT bump', async () => {
    const { registry } = makeRegistry();
    const { client } = makeClient();
    const source = new PlatformSource(registry, client, { logger: silentLogger });

    await source.applyWatchEvent({ type: 'ADDED', object: providerPortalPluginResource() });
    expect(registry.getPlugin('compute')?.spec.suspend).toBe(false);

    await source.applyWatchEvent({
      type: 'MODIFIED',
      object: providerPortalPluginResource(
        { suspend: true },
        { generation: 1, resourceVersion: '150' }
      ),
    });
    expect(registry.getPlugin('compute')).toBeUndefined();
  });

  test('a spec change that does not alter conditions reconciles but skips a redundant status patch', async () => {
    const { registry } = makeRegistry();
    const { client, calls } = makeClient();
    const source = new PlatformSource(registry, client, { logger: silentLogger });

    await source.applyWatchEvent({ type: 'ADDED', object: providerPortalPluginResource() });
    const writtenConditions = readyConditions(
      calls.find((c) => c.init.method === 'PATCH')!.init.body as string
    );
    const patchesAfterAdd = calls.filter((c) => c.init.method === 'PATCH').length;

    await source.applyWatchEvent({
      type: 'MODIFIED',
      object: providerPortalPluginResource(
        { deprecated: true },
        { generation: 2, resourceVersion: '200' },
        { conditions: writtenConditions }
      ),
    });

    expect(registry.getPlugin('compute')?.spec.deprecated).toBe(true);
    expect(calls.filter((c) => c.init.method === 'PATCH').length).toBe(patchesAfterAdd);
  });

  test('DELETED removes the plugin from the registry', async () => {
    const { registry } = makeRegistry();
    const { client } = makeClient();
    const source = new PlatformSource(registry, client, { logger: silentLogger });

    await source.applyWatchEvent({ type: 'ADDED', object: providerPortalPluginResource() });
    expect(registry.getPlugin('compute')).toBeDefined();

    await source.applyWatchEvent({
      type: 'DELETED',
      object: { metadata: { name: 'compute-datumapis-com' }, spec: { slug: 'compute' } },
    });
    expect(registry.getPlugin('compute')).toBeUndefined();
  });

  test('ERROR event throws to trigger a re-list', async () => {
    const { registry } = makeRegistry();
    const { client } = makeClient();
    const source = new PlatformSource(registry, client, { logger: silentLogger });

    await expect(
      source.applyWatchEvent({ type: 'ERROR', object: { code: 410, message: 'too old' } })
    ).rejects.toThrow();
  });
});
