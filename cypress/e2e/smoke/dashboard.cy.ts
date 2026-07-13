describe('Dashboard', () => {
  beforeEach(() => {
    cy.login();
  });

  it('renders the assistant workspace at the root', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/');
    // Title is set unconditionally in app/routes/dashboard/index.tsx; the chat
    // body itself only renders when CHATBOT_ENABLED (off in CI).
    cy.title().should('include', 'Assistant');
  });

  it('renders the overview with the summary stat cards', () => {
    cy.visit('/overview');
    cy.location('pathname').should('eq', '/overview');

    // Stat card labels rendered via <Trans> in app/routes/dashboard/overview.tsx
    cy.contains('Users').should('be.visible');
    cy.contains('Organizations').should('be.visible');
    cy.contains('Projects').should('be.visible');
    cy.contains('Fraud Evaluations').should('be.visible');
  });
});
