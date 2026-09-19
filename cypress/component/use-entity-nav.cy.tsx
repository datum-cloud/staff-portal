import { useEntityNav } from '@/features/milo';
import { pluginKeys } from '@/modules/plugins/client/use-plugins';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mount } from 'cypress/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';

// useMatches() (which useEntityNav walks) only works under a *data* router
// (RouterProvider), not the declarative <MemoryRouter>/<Routes> the shared
// cy.mount command wraps components in — so these tests build their own
// router instead of using cy.mount.
function Probe() {
  const nav = useEntityNav();
  return <div data-testid="probe">{nav ? nav.title : 'none'}</div>;
}

function mountAtPath(routes: RouteObject[], path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } },
  });
  // useEntityNav calls usePlugins() unconditionally (see its doc comment) —
  // seed an empty result so it never hits the network.
  queryClient.setQueryData(pluginKeys.list(), []);

  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return mount(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe('useEntityNav', () => {
  it("resolves the deepest match's entityNav, overriding its parent's", () => {
    mountAtPath(
      [
        {
          path: '/parent',
          handle: { entityNav: () => ({ title: 'Parent', groups: [] }) },
          children: [
            {
              path: 'child',
              handle: { entityNav: () => ({ title: 'Child', groups: [] }) },
              element: <Probe />,
            },
          ],
        },
      ],
      '/parent/child'
    );

    cy.get('[data-testid="probe"]').should('have.text', 'Child');
  });

  it("inherits an ancestor's entityNav when the deepest match declares none", () => {
    mountAtPath(
      [
        {
          path: '/parent',
          handle: { entityNav: () => ({ title: 'Parent', groups: [] }) },
          children: [{ path: 'child', element: <Probe /> }],
        },
      ],
      '/parent/child'
    );

    cy.get('[data-testid="probe"]').should('have.text', 'Parent');
  });

  it('falls back to nothing (the section rail) when no route declares entityNav', () => {
    mountAtPath([{ path: '/plain', element: <Probe /> }], '/plain');

    cy.get('[data-testid="probe"]').should('have.text', 'none');
  });

  it("invokes entityNav with the route's loader data and URL params", () => {
    mountAtPath(
      [
        {
          path: '/orgs/:orgName',
          loader: () => ({ displayName: 'Datum Cloud' }),
          handle: {
            entityNav: (data: { displayName: string }, params: { orgName?: string }) => ({
              title: `${data.displayName} (${params.orgName})`,
              groups: [],
            }),
          },
          element: <Probe />,
        },
      ],
      '/orgs/datum-cloud'
    );

    cy.get('[data-testid="probe"]').should('have.text', 'Datum Cloud (datum-cloud)');
  });
});
