import { PrometheusError } from './errors';
import { PrometheusService } from './service';
import { describe, expect, it } from 'bun:test';

function serviceWithStubbedGet(calls: { url: string; params: unknown }[], values: string[]) {
  const service = new PrometheusService(undefined, { baseURL: 'http://prometheus.invalid' });
  // Replace the axios client's get so no network request is made.
  (service as unknown as { client: { get: unknown } }).client.get = async (
    url: string,
    config: { params: unknown }
  ) => {
    calls.push({ url, params: config.params });
    return { data: { status: 'success', data: values } };
  };
  return service;
}

describe('PrometheusService labels requests', () => {
  it('returns label values scoped by the match selector', async () => {
    const calls: { url: string; params: unknown }[] = [];
    const service = serviceWithStubbedGet(calls, ['instance-a', 'instance-b']);

    const result = await service.handleAPIRequest({
      type: 'labels',
      label: 'resource_name',
      match: '{project="p1"}',
    });

    expect(result).toEqual(['instance-a', 'instance-b']);
    expect(calls).toEqual([
      { url: '/api/v1/label/resource_name/values', params: { 'match[]': '{project="p1"}' } },
    ]);
  });

  it('omits match[] when no selector is given', async () => {
    const calls: { url: string; params: unknown }[] = [];
    const service = serviceWithStubbedGet(calls, []);

    await service.handleAPIRequest({ type: 'labels', label: 'resource_name' });

    expect(calls[0]?.params).toEqual({});
  });

  it.each(['../status/config', 'resource_name/values?x=', '', '1abc'])(
    'rejects invalid label name %p without calling Prometheus',
    async (label) => {
      const calls: { url: string; params: unknown }[] = [];
      const service = serviceWithStubbedGet(calls, []);

      await expect(service.handleAPIRequest({ type: 'labels', label })).rejects.toBeInstanceOf(
        PrometheusError
      );
      expect(calls).toHaveLength(0);
    }
  );

  it('rejects a non-string match selector', async () => {
    const calls: { url: string; params: unknown }[] = [];
    const service = serviceWithStubbedGet(calls, []);

    await expect(
      service.handleAPIRequest({ type: 'labels', label: 'resource_name', match: { a: 1 } })
    ).rejects.toBeInstanceOf(PrometheusError);
    expect(calls).toHaveLength(0);
  });
});
