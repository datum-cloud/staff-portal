import { DnsZoneList, DnsZoneStatusCard, type DnsZoneRow } from '@/features/dns';
import type { ComMiloapisNetworkingDnsV1Alpha1DnsZone } from '@openapi/dns.networking.miloapis.com/v1alpha1';

type ZoneStatus = NonNullable<ComMiloapisNetworkingDnsV1Alpha1DnsZone['status']>;

const THEMES = ['light', 'dark'] as const;

const condition = (
  type: string,
  status: 'True' | 'False' | 'Unknown',
  reason: string,
  message = ''
) => ({ type, status, reason, message, lastTransitionTime: '2026-10-01T10:00:00Z' });

const READY: ZoneStatus = {
  conditions: [
    condition('Accepted', 'True', 'Accepted'),
    condition('Programmed', 'True', 'Programmed'),
  ],
  nameservers: ['ns1.datumdomains.net', 'ns2.datumdomains.net.'],
  recordCount: 3,
};

const FAILED: ZoneStatus = {
  conditions: [
    condition('Accepted', 'True', 'Accepted'),
    condition('Programmed', 'False', 'ProgrammingFailed', 'backend rejected the zone'),
  ],
};

const VALIDATING: ZoneStatus = {
  conditions: [condition('Accepted', 'Unknown', 'Validating', 'validating the domain')],
};

const zone = (name: string, status?: ZoneStatus): DnsZoneRow => ({
  projectName: 'p1',
  dnsZone: {
    metadata: { name, namespace: 'default', creationTimestamp: '2026-10-01T10:00:00Z' },
    spec: { domainName: `${name}.example.com`, dnsZoneClassName: 'default' },
    status,
  },
});

const row = (domain: string) => cy.contains('tr', domain);

THEMES.forEach((theme) => {
  describe(`DNS zone readiness (${theme} theme)`, () => {
    beforeEach(() => {
      cy.document().then((doc) => doc.documentElement.classList.toggle('dark', theme === 'dark'));
    });

    describe('DnsZoneList status column', () => {
      // The list reads useMatches(), so it needs a data router.
      beforeEach(() => {
        cy.mountRemixRoute(
          <DnsZoneList
            loading={false}
            linkBuilder={() => null}
            data={[
              zone('ready', READY),
              zone('failed', FAILED),
              zone('validating', VALIDATING),
              zone('indexed'),
            ]}
          />
        );
      });

      it('shows Ready when Accepted and Programmed are True', () => {
        row('ready.example.com').contains('Ready').should('be.visible');
      });

      it('shows Failed when a condition is False', () => {
        row('failed.example.com').contains('Failed').should('be.visible');
      });

      it('shows Pending while a condition is Unknown', () => {
        row('validating.example.com').contains('Pending').should('be.visible');
      });

      it('shows no badge for a row without a status', () => {
        row('indexed.example.com').within(() => {
          cy.contains('Ready').should('not.exist');
          cy.contains('Pending').should('not.exist');
          cy.contains('Failed').should('not.exist');
        });
      });
    });

    describe('DnsZoneStatusCard', () => {
      it('lists every condition and the assigned nameservers as FQDNs', () => {
        cy.mount(<DnsZoneStatusCard status={READY} />);
        cy.contains('Zone status').should('be.visible');
        cy.contains('Ready').should('be.visible');
        cy.contains('td', 'Accepted').should('be.visible');
        cy.contains('td', 'Programmed').should('be.visible');
        cy.get('[data-testid="dns-zone-assigned-nameservers"] li').should('have.length', 2);
        cy.contains('code', /^ns1\.datumdomains\.net\.$/).should('be.visible');
        cy.contains('code', /^ns2\.datumdomains\.net\.$/).should('be.visible');
      });

      it('shows the failure reason and message', () => {
        cy.mount(<DnsZoneStatusCard status={FAILED} />);
        cy.contains('Failed').should('be.visible');
        cy.contains('ProgrammingFailed').should('be.visible');
        cy.contains('backend rejected the zone').should('be.visible');
        cy.contains('No nameservers assigned yet.').should('be.visible');
      });

      it('is pending with empty states when the zone has no status yet', () => {
        cy.mount(<DnsZoneStatusCard status={undefined} />);
        cy.contains('Pending').should('be.visible');
        cy.contains('No conditions reported yet.').should('be.visible');
        cy.contains('No nameservers assigned yet.').should('be.visible');
      });
    });
  });
});
