describe('Home page', () => {
  it('loads and shows heading', () => {
    cy.visit('/');
    cy.contains('App Version');
  });
});
