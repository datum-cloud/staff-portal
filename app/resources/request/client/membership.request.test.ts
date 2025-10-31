import {
  importAfterMocks,
  mockLogger,
  mockRequestClient,
} from '@/tests/setup/unit/request-client.mock';
import { describe, expect, test, vi, beforeEach } from 'vitest';

mockLogger();
const axiosMock = mockRequestClient();

describe('membership.request', () => {
  let userOrgListQuery: typeof import('./membership.request').userOrgListQuery;
  let buildFieldSelector: typeof import('./membership.request').buildFieldSelector;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await importAfterMocks<
      typeof import('@/resources/request/client/membership.request')
    >('@/resources/request/client/membership.request');
    userOrgListQuery = mod.userOrgListQuery;
    buildFieldSelector = mod.buildFieldSelector;
  }, 20000);

  test('buildFieldSelector builds CSV', () => {
    const s = buildFieldSelector({ a: '1', b: '2' });
    expect(s).toBe('a=1,b=2');
  });

  test('userOrgListQuery builds fieldSelector including user and extras', async () => {
    await userOrgListQuery('user-1', {
      limit: 5,
      cursor: 'c1',
      filters: { fieldSelector: 'x=y,z=w' },
    });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/resourcemanager.miloapis.com/v1alpha1/organizationmemberships',
      params: {
        limit: 5,
        continue: 'c1',
        fieldSelector: expect.stringContaining('spec.userRef.name=user-1'),
      },
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });
});
