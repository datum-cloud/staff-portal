import {
  OTHER_GROUP,
  resolveResourceDisplayName,
  resolveServiceDisplayName,
} from '@/features/quota/lib/service-catalog';

describe('resolveServiceDisplayName', () => {
  it('uses the owner reference when present', () => {
    expect(resolveServiceDisplayName('networking.datumapis.com', 'anything/x')).to.equal(
      'Networking'
    );
  });

  it('falls back to the resourceType bridge when owner is missing', () => {
    expect(resolveServiceDisplayName(undefined, 'gateway.envoyproxy.io/securitypolicies')).to.equal(
      'Networking'
    );
  });

  it('maps milo core resourceTypes to Platform Core', () => {
    expect(resolveServiceDisplayName('core.miloapis.com', 'core.miloapis.com/configmaps')).to.equal(
      'Platform Core'
    );
  });

  it('groups compute fan-out registrations under Compute via the service label', () => {
    expect(
      resolveServiceDisplayName('compute.datumapis.com', 'compute.datumapis.com/instances')
    ).to.equal('Compute');
  });

  it('returns the Other group when nothing matches', () => {
    expect(resolveServiceDisplayName(undefined, 'unknown.example.com/widgets')).to.equal(
      OTHER_GROUP
    );
  });
});

describe('resolveResourceDisplayName', () => {
  it('prefers the server-authored display name', () => {
    expect(
      resolveResourceDisplayName('Compute Instances', 'compute.datumapis.com/instances')
    ).to.equal('Compute Instances');
  });

  it('falls back to the interim resourceType map when the annotation is missing', () => {
    expect(resolveResourceDisplayName(undefined, 'compute.datumapis.com/vcpus')).to.equal('vCPUs');
  });

  it('returns the raw resourceType when nothing matches', () => {
    expect(resolveResourceDisplayName(undefined, 'unknown.example.com/widgets')).to.equal(
      'unknown.example.com/widgets'
    );
  });
});
