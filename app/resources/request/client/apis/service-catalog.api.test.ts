import { buildServiceActivationRequest, listServiceConsumers } from './service-catalog.api';
import { serviceConsumersOp } from '@/resources/gql/service-consumer.gql';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/resources/gql/service-consumer.gql', () => ({ serviceConsumersOp: vi.fn() }));

describe('buildServiceActivationRequest', () => {
  it('targets the selected consumer from the provider project', () => {
    expect(
      buildServiceActivationRequest({
        serviceName: 'compute.miloapis.com',
        consumerProject: 'customer-production',
        requestMessage: '  Managed onboarding  ',
      })
    ).toEqual({
      apiVersion: 'services.miloapis.com/v1alpha1',
      kind: 'ServiceActivationRequest',
      metadata: { generateName: 'compute.miloapis.com-' },
      spec: {
        serviceRef: { name: 'compute.miloapis.com' },
        consumerProjectRef: { name: 'customer-production' },
        requestMessage: 'Managed onboarding',
      },
    });
  });

  it('omits a blank optional message', () => {
    const request = buildServiceActivationRequest({
      serviceName: 'compute.miloapis.com',
      consumerProject: 'customer-production',
      requestMessage: '   ',
    });

    expect(request.spec.requestMessage).toBeUndefined();
  });
});

describe('listServiceConsumers', () => {
  const consumer = (organizationDisplayName?: string) => ({
    name: 'consumer-a',
    serviceName: 'dns',
    phase: 'Active',
    consumerProject: {
      name: 'proj-a',
      displayName: 'Project A',
      organizationName: 'acme',
      organizationDisplayName,
    },
  });

  it('falls back to the org name when the gateway could not read the org', async () => {
    vi.mocked(serviceConsumersOp).mockResolvedValueOnce({ serviceConsumers: [consumer()] });

    const [row] = await listServiceConsumers('producer');

    expect(row.consumerProject.organizationDisplayName).toBe('acme');
  });

  it('keeps the display name when the gateway returns one', async () => {
    vi.mocked(serviceConsumersOp).mockResolvedValueOnce({
      serviceConsumers: [consumer('Acme Corp')],
    });

    const [row] = await listServiceConsumers('producer');

    expect(row.consumerProject.organizationDisplayName).toBe('Acme Corp');
  });
});
