describe('Dashboard', () => {
  beforeEach(() => {
    cy.login();
  });

  it('renders the platform landing page at the root', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/');
    cy.title().should('include', 'Home');

    // Section headings rendered via <Trans> in app/features/dashboard/components/home/*.
    cy.contains('h1', 'Datum Platform').should('be.visible');
    cy.contains('New users').should('be.visible');
    cy.contains('New organizations').should('be.visible');
    cy.contains('Needs review').should('be.visible');
    cy.contains('Growth').should('be.visible');
    cy.contains('Platform health').should('be.visible');
    cy.contains('Activity').should('be.visible');
  });
});
