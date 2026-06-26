describe('Authentication gate', () => {
  it('redirects unauthenticated requests for a protected page to /login', () => {
    // The private layout loader redirects unauthenticated users (app/layouts/private.layout.tsx).
    cy.request({ url: '/', followRedirect: false }).then((response) => {
      expect(response.status).to.be.oneOf([301, 302, 303, 307, 308]);
      expect(response.redirectedToUrl ?? response.headers.location).to.include('/login');
    });
  });

  it('allows an authenticated staff session to load the dashboard', () => {
    cy.login();
    cy.visit('/');
    cy.location('pathname').should('eq', '/');
    cy.title().should('not.be.empty');
  });
});
