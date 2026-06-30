import { RecentUsersWidget } from '@/features/dashboard/components/recent-users-widget';
import { activityListFixture } from '@/tests/fixtures/activity-list';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Renders the REAL RecentUsersWidget. Instead of mocking the API module
// (not possible in Cypress component tests), we seed the React Query cache with
// staleTime: Infinity so the widget reads our fixture and never calls the real
// queryFn / network. The widget reads the cache under the ['users', 'recent'] key.
const mountWithData = (data: unknown) => {
  // staleTime: Infinity → the seeded data is never stale, so the widget's
  // queryFn never runs (no network). gcTime must NOT be 0: the data is seeded
  // before any observer mounts, and gcTime: 0 would garbage-collect it
  // immediately, causing a cache miss + real fetch.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
    },
  });
  queryClient.setQueryData(['users', 'recent'], data);

  cy.mount(
    <QueryClientProvider client={queryClient}>
      <RecentUsersWidget />
    </QueryClientProvider>
  );
};

describe('RecentUsersWidget', () => {
  it('renders the widget chrome (title, description, view all)', () => {
    mountWithData(activityListFixture.empty);
    cy.contains('Recent Users').should('be.visible');
    cy.contains('Last 10 new users who joined Datum').should('be.visible');
    cy.contains('button', 'View All').should('be.visible');
  });

  it('renders the empty state when there are no users', () => {
    mountWithData(activityListFixture.empty);
    cy.contains('No users yet').should('be.visible');
    cy.contains('Users will appear here once they join Datum').should('be.visible');
  });

  it('renders user items when data is available', () => {
    mountWithData(activityListFixture.withUsers);
    cy.contains('No users yet').should('not.exist');
    cy.contains('Evan Vetere').should('be.visible');
  });
});
