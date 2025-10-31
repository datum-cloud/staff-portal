import {
  importAfterMocks,
  mockLogger,
  mockRequestClient,
} from '@/tests/setup/unit/request-client.mock';
import { describe, expect, test, vi, beforeEach } from 'vitest';

describe('activity.request', () => {
  let activityListQuery: typeof import('./activity.request').activityListQuery;
  mockLogger();
  const axiosMock = mockRequestClient();

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await importAfterMocks<
      typeof import('@/resources/request/client/activity.request')
    >('@/resources/request/client/activity.request');
    activityListQuery = mod.activityListQuery;
  }, 20000);

  test('activityListQuery builds params with filters and single resource', async () => {
    await activityListQuery('Project', 'proj-1', {
      limit: 50,
      search: 'foo',
      filters: {
        start: 1714857600000,
        end: 1714857600000,
        project: 'proj-1',
        organization: 'org-1',
        user: 'user-1',
        status: 'success',
        actions: 'create,update',
        responseCode: '200',
        apiGroup: 'iam.miloapis.com',
        namespace: 'default',
        sourceIP: '127.0.0.1',
      },
    });

    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '',
      baseURL: '/api/activity',
      params: expect.objectContaining({
        limit: 50,
        q: 'foo',
        project: 'proj-1',
        organization: 'org-1',
        resourceType: 'Project',
        resourceId: 'proj-1',
        user: 'user-1',
        status: 'success',
        actions: 'create,update',
        responseCode: '200',
        apiGroup: 'iam.miloapis.com',
        namespace: 'default',
        sourceIP: '127.0.0.1',
      }),
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });
});
