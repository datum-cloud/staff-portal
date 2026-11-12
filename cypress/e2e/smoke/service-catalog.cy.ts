import { offerRoutes, serviceCatalogRoutes } from '@/utils/config/routes.config';

// Read-only: these specs open the catalog and the offers list. They never
// approve a request, publish a service or create an offer.
describe('Admin — Service Catalog', () => {
  beforeEach(() => {
    cy.login();
  });

  it('loads the service catalog page', () => {
    cy.visit(serviceCatalogRoutes.list());
    cy.location('pathname').should('eq', serviceCatalogRoutes.list());
    cy.title().should('include', 'Service Catalog');

    cy.get('input[placeholder="Search by name, description, or owner..."]', {
      timeout: 15000,
    }).should('exist');
    cy.contains('Failed to load service catalog.').should('not.exist');
    // The count line replaces the loading skeleton once the list has loaded.
    cy.contains(/\d+ services/, { timeout: 15000 }).should('be.visible');
  });

  it('filters the catalog down to nothing for a search with no match', () => {
    cy.visit(serviceCatalogRoutes.list());
    cy.contains(/\d+ services/, { timeout: 15000 }).should('be.visible');

    cy.get('input[placeholder="Search by name, description, or owner..."]').type(
      'zz-no-such-service-zz'
    );
    cy.contains(/^0 (of \d+ )?services$/).should('be.visible');
  });
});

describe('Admin — Offers', () => {
  beforeEach(() => {
    cy.login();
  });

  it('loads the offers list page', () => {
    cy.visit(offerRoutes.list());
    cy.location('pathname').should('eq', offerRoutes.list());
    cy.title().should('include', 'Offers');

    cy.get('table', { timeout: 15000 }).should('exist');
    cy.get('input[placeholder="Search offers..."]').should('exist');
  });
});
