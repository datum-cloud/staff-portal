import {
  importAfterMocks,
  mockLogger,
  mockRequestClient,
} from '@/tests/setup/unit/request-client.mock';
import { describe, expect, test, vi, beforeEach } from 'vitest';

mockLogger();
const axiosMock = mockRequestClient();

describe('project.request', () => {
  let projectListQuery: typeof import('./project.request').projectListQuery;
  let projectHttpProxyListQuery: typeof import('./project.request').projectHttpProxyListQuery;
  let projectExportPolicyListQuery: typeof import('./project.request').projectExportPolicyListQuery;
  let projectDomainListQuery: typeof import('./project.request').projectDomainListQuery;
  let projectDomainStatusQuery: typeof import('./project.request').projectDomainStatusQuery;
  let projectDeleteMutation: typeof import('./project.request').projectDeleteMutation;
  let projectDnsListQuery: typeof import('./project.request').projectDnsListQuery;
  let projectDnsRecordListQuery: typeof import('./project.request').projectDnsRecordListQuery;
  let projectDnsRecordStatusQuery: typeof import('./project.request').projectDnsRecordStatusQuery;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await importAfterMocks<typeof import('@/resources/request/client/project.request')>(
      '@/resources/request/client/project.request'
    );
    projectListQuery = mod.projectListQuery;
    projectHttpProxyListQuery = mod.projectHttpProxyListQuery;
    projectExportPolicyListQuery = mod.projectExportPolicyListQuery;
    projectDomainListQuery = mod.projectDomainListQuery;
    projectDomainStatusQuery = mod.projectDomainStatusQuery;
    projectDeleteMutation = mod.projectDeleteMutation;
    projectDnsListQuery = mod.projectDnsListQuery;
    projectDnsRecordListQuery = mod.projectDnsRecordListQuery;
    projectDnsRecordStatusQuery = mod.projectDnsRecordStatusQuery;
  }, 20000);

  test('projectListQuery with search', async () => {
    await projectListQuery({ limit: 10, cursor: 'c1', search: 'app' });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/resourcemanager.miloapis.com/v1alpha1/projects',
      params: { limit: 10, continue: 'c1', fieldSelector: 'metadata.name=app' },
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('projectHttpProxyListQuery', async () => {
    await projectHttpProxyListQuery('proj', { limit: 2, cursor: 'n1' });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/resourcemanager.miloapis.com/v1alpha1/projects/proj/control-plane/apis/networking.datumapis.com/v1alpha/httpproxies',
      params: { limit: 2, continue: 'n1' },
    });
  });

  test('projectExportPolicyListQuery', async () => {
    await projectExportPolicyListQuery('proj', { limit: 3 });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/resourcemanager.miloapis.com/v1alpha1/projects/proj/control-plane/apis/telemetry.miloapis.com/v1alpha1/exportpolicies',
      params: { limit: 3 },
    });
  });

  test('projectDnsListQuery', async () => {
    await projectDnsListQuery('proj', { limit: 4, cursor: 'n3' });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/resourcemanager.miloapis.com/v1alpha1/projects/proj/control-plane/apis/dns.networking.miloapis.com/v1alpha1/dnszones',
      params: { limit: 4, continue: 'n3' },
    });
  });

  test('projectDnsRecordListQuery', async () => {
    await projectDnsRecordListQuery('proj', 'example.com', 'default');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/resourcemanager.miloapis.com/v1alpha1/projects/proj/control-plane/apis/dns.networking.miloapis.com/v1alpha1/namespaces/default/dnsrecordsets',
      params: { fieldSelector: 'spec.dnsZoneRef.name=example.com' },
    });
  });

  test('projectDnsRecordStatusQuery', async () => {
    await projectDnsRecordStatusQuery('proj', 'example.com', 'default');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/resourcemanager.miloapis.com/v1alpha1/projects/proj/control-plane/apis/dns.networking.miloapis.com/v1alpha1/namespaces/default/dnsrecordsets/example.com/status',
    });
  });

  test('projectDomainListQuery', async () => {
    await projectDomainListQuery('proj', { cursor: 'n2' });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/resourcemanager.miloapis.com/v1alpha1/projects/proj/control-plane/apis/networking.datumapis.com/v1alpha/domains',
      params: { continue: 'n2' },
    });
  });

  test('projectDomainStatusQuery', async () => {
    await projectDomainStatusQuery('proj', 'example.com');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/resourcemanager.miloapis.com/v1alpha1/projects/proj/control-plane/apis/networking.datumapis.com/v1alpha/namespaces/default/domains/example.com/status',
    });
  });

  test('projectDeleteMutation', async () => {
    await projectDeleteMutation('proj');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'DELETE',
      url: '/apis/resourcemanager.miloapis.com/v1alpha1/projects/proj',
    });
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });
});
