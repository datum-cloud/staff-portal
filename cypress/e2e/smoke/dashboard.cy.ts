describe('Dashboard', () => {
  beforeEach(() => {
    cy.login();
  });

  it('renders the dashboard with the summary stat cards', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/');

    // Stat card labels rendered via <Trans> in app/routes/dashboard/index.tsx
    cy.contains('Users').should('be.visible');
    cy.contains('Organizations').should('be.visible');
    cy.contains('Projects').should('be.visible');
    cy.contains('Fraud Evaluations').should('be.visible');
  });
});
