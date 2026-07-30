import { ChainsawTestsWidget } from '@/features/chainsaw-tests/components/chainsaw-tests-widget';
import { chainsawTestsFixture } from '@/tests/fixtures/chainsaw-tests';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Renders the REAL ChainsawTestsWidget. Seed the React Query cache with
// staleTime: Infinity so the widget reads our fixture and never calls the
// real queryFn / network. The widget reads the cache under the
// ['dashboard', 'chainsaw-tests'] key (see use-chainsaw-tests.ts).
const mountWithData = (data: unknown) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
    },
  });
  queryClient.setQueryData(['dashboard', 'chainsaw-tests'], data);

  cy.mount(
    <QueryClientProvider client={queryClient}>
      <ChainsawTestsWidget />
    </QueryClientProvider>
  );
};

describe('ChainsawTestsWidget', () => {
  it('renders the widget chrome (title, description, CI runs link)', () => {
    mountWithData(chainsawTestsFixture.empty);
    cy.contains('Chainsaw Tests').should('be.visible');
    cy.contains('Last 3 days').should('be.visible');
    cy.contains('a', 'CI runs').should('have.attr', 'href').and('include', 'run-e2e-tests.yaml');
  });

  it('renders the empty state when no tests are labeled stable', () => {
    mountWithData(chainsawTestsFixture.empty);
    cy.contains('No stable tests labeled yet').should('be.visible');
  });

  it('renders a passing test with Grafana and test-docs links', () => {
    mountWithData(chainsawTestsFixture.allPassing);
    cy.contains('dns-setup').should('be.visible');
    cy.contains('Passing').should('be.visible');
    cy.contains('a', 'Grafana').should('have.attr', 'href').and('include', 'var-test=dns-setup');
    cy.contains('a', 'Test docs')
      .should('have.attr', 'href')
      .and('include', 'tests/construct/networking/dns-setup/README.md');
  });

  it('renders a mix of passing and failing tests', () => {
    mountWithData(chainsawTestsFixture.mixed);
    cy.contains('dns-setup').should('be.visible');
    cy.contains('api-health').should('be.visible');
    cy.contains('Passing').should('be.visible');
    cy.contains('Failing').should('be.visible');
  });
});
