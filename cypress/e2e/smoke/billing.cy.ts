import { billingAccountRoutes } from '@/utils/config/routes.config';

// Read-only: these specs open list pages and switch views. They never submit a
// form, decide an application or change an account.
describe('Customers — Billing Accounts', () => {
  beforeEach(() => {
    cy.login();
  });

  it('loads the billing accounts list page', () => {
    cy.visit(billingAccountRoutes.list());
    cy.location('pathname').should('eq', billingAccountRoutes.list());
    cy.title().should('include', 'Billing Accounts');

    cy.get('table', { timeout: 15000 }).should('exist');
    cy.get('input[placeholder="Search billing accounts..."]').should('exist');
  });

  it('loads the payment terms applications queue', () => {
    cy.visit(billingAccountRoutes.applications.list());
    cy.location('pathname').should('eq', billingAccountRoutes.applications.list());
    cy.title().should('include', 'Payment Terms Applications');

    cy.get('table', { timeout: 15000 }).should('exist');
    cy.get('input[placeholder="Search applications..."]').should('exist');
  });

  it('switches between the Accounts and Applications views', () => {
    cy.visit(billingAccountRoutes.list());
    cy.get('table', { timeout: 15000 }).should('exist');

    cy.get(`nav a[href="${billingAccountRoutes.applications.list()}"]`).click();
    cy.location('pathname').should('eq', billingAccountRoutes.applications.list());
    cy.get('input[placeholder="Search applications..."]').should('exist');

    cy.get(`nav a[href="${billingAccountRoutes.list()}"]`).click();
    cy.location('pathname').should('eq', billingAccountRoutes.list());
    cy.get('input[placeholder="Search billing accounts..."]').should('exist');
  });
});
