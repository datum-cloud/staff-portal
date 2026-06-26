import { projectRoutes } from '@/utils/config/routes.config';

describe('Customers — Projects list', () => {
  beforeEach(() => {
    cy.login();
  });

  it('loads the projects list page', () => {
    cy.visit(projectRoutes.list());
    cy.location('pathname').should('eq', projectRoutes.list());
    cy.title().should('include', 'Projects');

    cy.get('table', { timeout: 15000 }).should('exist');
    cy.get('input[placeholder="Search projects..."]').should('exist');
  });
});
