import { fraudRoutes } from '@/utils/config/routes.config';

// Read-only: these specs open the three Fraud & Abuse views. They never run an
// evaluation, add or delete a provider, or save the policy.
describe('Customers — Fraud & Abuse', () => {
  beforeEach(() => {
    cy.login();
  });

  it('loads the fraud evaluations list page', () => {
    cy.visit(fraudRoutes.evaluations.list());
    cy.location('pathname').should('eq', fraudRoutes.evaluations.list());
    cy.title().should('include', 'Fraud Evaluations');

    cy.get('table', { timeout: 15000 }).should('exist');
    cy.get('input[placeholder="Search by email, name, or ID..."]').should('exist');
  });

  it('loads the fraud providers list page', () => {
    cy.visit(fraudRoutes.providers.list());
    cy.location('pathname').should('eq', fraudRoutes.providers.list());
    cy.title().should('include', 'Fraud Providers');

    cy.get('table', { timeout: 15000 }).should('exist');
    cy.get('input[placeholder="Search providers..."]').should('exist');
  });

  it('loads the fraud policy page', () => {
    cy.visit(fraudRoutes.policy());
    cy.location('pathname').should('eq', fraudRoutes.policy());
    cy.title().should('include', 'Fraud Policy');
  });

  it('switches from Evaluations to Providers through the view tabs', () => {
    cy.visit(fraudRoutes.evaluations.list());
    cy.get('table', { timeout: 15000 }).should('exist');

    cy.get(`nav a[href="${fraudRoutes.providers.list()}"]`).click();
    cy.location('pathname').should('eq', fraudRoutes.providers.list());
    cy.get('input[placeholder="Search providers..."]').should('exist');

    // The Policy view stays one click away from either list.
    cy.get(`nav a[href="${fraudRoutes.policy()}"]`).should('exist');
  });
});
