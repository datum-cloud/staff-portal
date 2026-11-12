import { orgRoutes } from '@/utils/config/routes.config';

// Read-only: toggling a flag creates or deletes a quota grant, so this spec
// only opens the page and never touches a switch.
describe('Customers — Organization detail: Feature Flags', () => {
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

  it("opens the organization's feature flags from the left rail", () => {
    cy.get('[data-slot="sidebar"]').contains('a', 'Feature Flags').click();

    cy.location('pathname', { timeout: 15000 }).should(
      'match',
      new RegExp(`^${orgRoutes.list()}/[^/]+/feature-flags$`)
    );
    cy.title().should('include', 'Feature Flags');

    cy.get('table', { timeout: 15000 }).should('exist');
    cy.get('input[placeholder="Search by flag key or description..."]').should('exist');
  });

  it('does not ask to confirm a toggle until a switch is used', () => {
    cy.get('[data-slot="sidebar"]').contains('a', 'Feature Flags').click();
    cy.get('table', { timeout: 15000 }).should('exist');

    cy.contains('Enable feature flag').should('not.exist');
    cy.contains('Disable feature flag').should('not.exist');
  });
});
