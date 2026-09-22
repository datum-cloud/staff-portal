import { orgRoutes } from '@/utils/config/routes.config';

describe('Customers — Organizations list', () => {
  beforeEach(() => {
    cy.login();
  });

  it('loads the organizations list page', () => {
    cy.visit(orgRoutes.list());
    cy.location('pathname').should('eq', orgRoutes.list());
    cy.title().should('include', 'Organizations');

    cy.get('table', { timeout: 15000 }).should('exist');
    cy.get('input[placeholder="Search organizations..."]').should('exist');
  });
});

describe('Customers — Organization detail: entity-scoped left nav (#775, #656)', () => {
  beforeEach(() => {
    cy.login();
    cy.visit(orgRoutes.list());
    cy.get('table', { timeout: 15000 }).should('exist');
    // Into the first organization row.
    cy.get('table tbody tr').first().find('a').first().click();
    cy.location('pathname', { timeout: 15000 }).should(
      'match',
      new RegExp(`^${orgRoutes.list()}/[^/]+$`)
    );
  });

  it("shows the organization's own nav in the left rail, not the Customers section nav", () => {
    // The rail moved onto datum-ui's Sidebar (sub-nav parity plan) — it's no
    // longer a literal <aside>, so target its own [data-slot="sidebar"] root.
    cy.get('[data-slot="sidebar"]').should('contain', 'Overview');
    cy.get('[data-slot="sidebar"]').should('contain', 'Members');
    cy.get('[data-slot="sidebar"]').should('contain', 'Quotas');

    // Customers section entries that don't belong to this org are gone.
    cy.get('[data-slot="sidebar"]').should('not.contain', 'Users');
    cy.get('[data-slot="sidebar"]').should('not.contain', 'Billing Accounts');
    cy.get('[data-slot="sidebar"]').should('not.contain', 'Fraud & Abuse');
  });

  it('has no horizontal tab strip on the page (moved to the rail)', () => {
    // TabStrip's root (tab-strip.tsx) — still used by Fraud, Operations →
    // Activity, and /customers/resources, but not here post-migration.
    cy.get('.bg-border\\/50').should('not.exist');
  });
});
