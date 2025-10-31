import {
  importAfterMocks,
  mockLogger,
  mockRequestClient,
} from '@/tests/setup/unit/request-client.mock';
import { describe, expect, test, vi, beforeEach } from 'vitest';

mockLogger();
const axiosMock = mockRequestClient();

describe('metrics.request', () => {
  let metricsCreateMutation: typeof import('./metrics.request').metricsCreateMutation;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await importAfterMocks<typeof import('@/resources/request/client/metrics.request')>(
      '@/resources/request/client/metrics.request'
    );
    metricsCreateMutation = mod.metricsCreateMutation;
  }, 20000);

  test('metricsCreateMutation posts to /api/metrics baseURL with payload', async () => {
    const payload = { name: 'event', value: 1 };
    await metricsCreateMutation(payload);
    expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
      method: 'POST',
      url: '',
      baseURL: '/api/metrics',
      data: payload,
    });
    expect(axiosMock.__builder.output).toHaveBeenCalledTimes(1);
    expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
  });
});
