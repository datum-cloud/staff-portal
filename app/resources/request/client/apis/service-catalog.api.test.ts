import { buildServiceActivationRequest } from './service-catalog.api';
import { describe, expect, it } from 'bun:test';

describe('buildServiceActivationRequest', () => {
  it('targets the selected consumer from the provider project', () => {
    expect(
      buildServiceActivationRequest({
        serviceName: 'compute',
        consumerProject: 'customer-production',
        requestMessage: '  Managed onboarding  ',
      })
    ).toEqual({
      apiVersion: 'services.miloapis.com/v1alpha1',
      kind: 'ServiceActivationRequest',
      metadata: { generateName: 'compute-' },
      spec: {
        serviceRef: { name: 'compute' },
        consumerProjectRef: { name: 'customer-production' },
        requestMessage: 'Managed onboarding',
      },
    });
  });

  it('omits a blank optional message', () => {
    const request = buildServiceActivationRequest({
      serviceName: 'compute',
      consumerProject: 'customer-production',
      requestMessage: '   ',
    });

    expect(request.spec.requestMessage).toBeUndefined();
  });
});
