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
