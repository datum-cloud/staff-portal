import type { ResourceGrantCreate } from '@/resources/schemas';
import {
  importAfterMocks,
  mockLogger,
  mockRequestClient,
} from '@/tests/setup/unit/request-client.mock';
import { describe, expect, test, vi, beforeEach } from 'vitest';

mockLogger();
const axiosMock = mockRequestClient();

describe('quota.request', () => {
  let quotaGrantListQuery: typeof import('./quota.request').quotaGrantListQuery;
  let quotaGrantDetailQuery: typeof import('./quota.request').quotaGrantDetailQuery;
  let orgQuotaGrantListQuery: typeof import('./quota.request').orgQuotaGrantListQuery;
  let projectQuotaGrantListQuery: typeof import('./quota.request').projectQuotaGrantListQuery;
  let quotaBucketListQuery: typeof import('./quota.request').quotaBucketListQuery;
  let quotaBucketDetailQuery: typeof import('./quota.request').quotaBucketDetailQuery;
  let orgQuotaBucketListQuery: typeof import('./quota.request').orgQuotaBucketListQuery;
  let projectQuotaBucketListQuery: typeof import('./quota.request').projectQuotaBucketListQuery;
  let quotaGrantCreateMutation: typeof import('./quota.request').quotaGrantCreateMutation;
  let quotaGrantDeleteMutation: typeof import('./quota.request').quotaGrantDeleteMutation;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await importAfterMocks<typeof import('@/resources/request/client/quota.request')>(
      '@/resources/request/client/quota.request'
    );
    quotaGrantListQuery = mod.quotaGrantListQuery;
    quotaGrantDetailQuery = mod.quotaGrantDetailQuery;
    orgQuotaGrantListQuery = mod.orgQuotaGrantListQuery;
    projectQuotaGrantListQuery = mod.projectQuotaGrantListQuery;
    quotaBucketListQuery = mod.quotaBucketListQuery;
    quotaBucketDetailQuery = mod.quotaBucketDetailQuery;
    orgQuotaBucketListQuery = mod.orgQuotaBucketListQuery;
    projectQuotaBucketListQuery = mod.projectQuotaBucketListQuery;
    quotaGrantCreateMutation = mod.quotaGrantCreateMutation;
    quotaGrantDeleteMutation = mod.quotaGrantDeleteMutation;
  });

  test('quotaGrantListQuery passes common params', async () => {
    await quotaGrantListQuery({
      limit: 5,
      cursor: 'c1',
      fieldSelector: 'a=b',
      labelSelector: 'x=y',
    });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/quota.miloapis.com/v1alpha1/resourcegrants',
      params: { limit: 5, continue: 'c1', fieldSelector: 'a=b', labelSelector: 'x=y' },
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('quotaGrantDetailQuery uses namespaced path', async () => {
    await quotaGrantDetailQuery('grant-1', 'org-ns');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/quota.miloapis.com/v1alpha1/namespaces/org-ns/resourcegrants/grant-1',
    });
  });

  test('orgQuotaGrantListQuery builds Organization fieldSelector', async () => {
    await orgQuotaGrantListQuery('acme', { resourceType: 'Email', limit: 10 });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/quota.miloapis.com/v1alpha1/resourcegrants',
      params: {
        limit: 10,
        fieldSelector:
          'spec.consumerRef.kind=Organization,spec.consumerRef.name=acme,spec.allowances.resourceType=Email',
      },
    });
  });

  test('projectQuotaGrantListQuery builds Project fieldSelector', async () => {
    await projectQuotaGrantListQuery('proj-1', { resourceType: 'SMS' });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/quota.miloapis.com/v1alpha1/resourcegrants',
      params: {
        fieldSelector:
          'spec.consumerRef.kind=Project,spec.consumerRef.name=proj-1,spec.allowances.resourceType=SMS',
      },
    });
  });

  test('quotaBucketListQuery passes common params', async () => {
    await quotaBucketListQuery({ limit: 7, cursor: 'nxt', fieldSelector: 'k=v' });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/quota.miloapis.com/v1alpha1/allowancebuckets',
      params: { limit: 7, continue: 'nxt', fieldSelector: 'k=v' },
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('quotaBucketDetailQuery uses cluster-scoped path', async () => {
    await quotaBucketDetailQuery('bucket-1');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/quota.miloapis.com/v1alpha1/allowancebuckets/bucket-1',
    });
  });

  test('orgQuotaBucketListQuery builds Organization fieldSelector', async () => {
    await orgQuotaBucketListQuery('acme', { resourceType: 'Email' });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/quota.miloapis.com/v1alpha1/allowancebuckets',
      params: {
        fieldSelector:
          'spec.consumerRef.kind=Organization,spec.consumerRef.name=acme,spec.resourceType=Email',
      },
    });
  });

  test('projectQuotaBucketListQuery builds Project fieldSelector', async () => {
    await projectQuotaBucketListQuery('p1');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/quota.miloapis.com/v1alpha1/allowancebuckets',
      params: {
        fieldSelector: 'spec.consumerRef.kind=Project,spec.consumerRef.name=p1',
      },
    });
  });

  test('quotaGrantCreateMutation posts typed payload', async () => {
    const payload: ResourceGrantCreate = {
      apiVersion: 'quota.miloapis.com/v1alpha1',
      kind: 'ResourceGrant',
      metadata: { generateName: 'grant-', namespace: 'org-acme' },
      spec: {
        consumerRef: {
          apiGroup: 'resourcemanager.miloapis.com',
          kind: 'Organization',
          name: 'acme',
        },
        allowances: [
          {
            resourceType: 'Email',
            buckets: [{ amount: 100 }],
          },
        ],
      },
    };

    await quotaGrantCreateMutation(payload);
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'POST',
      url: '/apis/quota.miloapis.com/v1alpha1/namespaces/org-acme/resourcegrants',
      data: payload,
    });
    expect(axiosMock.__builder.input).toHaveBeenCalledTimes(1);
  });

  test('quotaGrantDeleteMutation deletes namespaced grant', async () => {
    await quotaGrantDeleteMutation('grant-x', 'org-acme');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'DELETE',
      url: '/apis/quota.miloapis.com/v1alpha1/namespaces/org-acme/resourcegrants/grant-x',
    });
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });
});
