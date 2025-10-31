import {
  importAfterMocks,
  mockLogger,
  mockRequestClient,
} from '@/tests/setup/unit/request-client.mock';
import { describe, expect, test, vi, beforeEach } from 'vitest';

mockLogger();
const axiosMock = mockRequestClient();

describe('identity.request', () => {
  let sessionListQuery: typeof import('./identity.request').sessionListQuery;
  let sessionDeleteMutation: typeof import('./identity.request').sessionDeleteMutation;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await importAfterMocks<
      typeof import('@/resources/request/client/identity.request')
    >('@/resources/request/client/identity.request');
    sessionListQuery = mod.sessionListQuery;
    sessionDeleteMutation = mod.sessionDeleteMutation;
  }, 20000);

  test('sessionListQuery builds path and params', async () => {
    await sessionListQuery('u-1', { limit: 10, cursor: 'c1', search: 'sname' });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/iam.miloapis.com/v1alpha1/users/u-1/control-plane/apis/identity.miloapis.com/v1alpha1/sessions',
      params: { limit: 10, continue: 'c1', fieldSelector: 'metadata.name=sname' },
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });

  test('sessionDeleteMutation builds path', async () => {
    await sessionDeleteMutation('u-1', 'sess-1');
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'DELETE',
      url: '/apis/iam.miloapis.com/v1alpha1/users/u-1/control-plane/apis/identity.miloapis.com/v1alpha1/sessions/sess-1',
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });
});
