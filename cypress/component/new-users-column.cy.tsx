import { NewUsersColumn } from '@/features/dashboard';
import type { RecentCreate } from '@/features/dashboard/hooks/use-platform-home';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Renders the REAL NewUsersColumn. Instead of mocking the API module (not
// possible in Cypress component tests), we seed the React Query cache with
// staleTime: Infinity so the column reads our rows and never calls the real
// queryFn / network. Keys match useRecentCreates('users') and the users count.
const mountWithData = (rows: RecentCreate[], total: number) => {
  // gcTime must NOT be 0: the data is seeded before any observer mounts, and
  // gcTime: 0 would garbage-collect it immediately, causing a real fetch.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
    },
  });
  queryClient.setQueryData(['dashboard', 'recent-creates', 'users', 5], rows);
  queryClient.setQueryData(['dashboard', 'kpi', 'users'], total);

  cy.mount(
    <QueryClientProvider client={queryClient}>
      <NewUsersColumn />
    </QueryClientProvider>
  );
};

describe('NewUsersColumn', () => {
  it('renders the header with the total user count', () => {
    mountWithData([], 1284);
    cy.contains('New users').should('be.visible');
    cy.contains('1,284').should('be.visible');
  });

  it('renders the empty state when nobody signed up', () => {
    mountWithData([], 0);
    cy.contains('No sign-ups in 30 days').should('be.visible');
  });

  it('renders a row per new user, linking to their profile', () => {
    mountWithData(
      [
        {
          name: '342540775839501844',
          displayName: 'Evan Vetere',
          secondary: 'evetere@datum.net',
          createdAt: '2025-10-17T01:56:52Z',
        },
      ],
      1
    );
    cy.contains('No sign-ups in 30 days').should('not.exist');
    cy.contains('a', 'evetere@datum.net').should(
      'have.attr',
      'href',
      '/customers/users/342540775839501844'
    );
  });
});
