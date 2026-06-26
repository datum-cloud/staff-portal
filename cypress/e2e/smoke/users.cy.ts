import { userRoutes } from '@/utils/config/routes.config';

describe('Customers — Users list', () => {
  beforeEach(() => {
    cy.login();
  });

  it('loads the users list page', () => {
    cy.visit(userRoutes.list());
    cy.location('pathname').should('eq', userRoutes.list());
    cy.title().should('include', 'Users');

    // Data table renders a search box and at least the column header row.
    cy.get('table', { timeout: 15000 }).should('exist');
    cy.contains('Name').should('be.visible');
  });
});
