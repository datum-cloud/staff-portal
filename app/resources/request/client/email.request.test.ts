import {
  importAfterMocks,
  mockLogger,
  mockRequestClient,
} from '@/tests/setup/unit/request-client.mock';
import { describe, expect, test, vi, beforeEach } from 'vitest';

mockLogger();
const axiosMock = mockRequestClient();

describe('email.request', () => {
  let emailListQuery: typeof import('./email.request').emailListQuery;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await importAfterMocks<typeof import('@/resources/request/client/email.request')>(
      '@/resources/request/client/email.request'
    );
    emailListQuery = mod.emailListQuery;
  }, 20000);

  test('emailListQuery builds params', async () => {
    await emailListQuery({ limit: 10, cursor: 'c1' });
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'GET',
      url: '/apis/notification.miloapis.com/v1alpha1/namespaces/milo-system/emails',
      params: { limit: 10, continue: 'c1' },
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });
});
