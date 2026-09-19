import { MiloSubNav } from '@/features/milo/components/sub-nav/milo-sub-nav';
import { type EntityNav } from '@/features/milo/lib/nav-config';
import { Activity } from 'lucide-react';

const ORG_ROOT = '/customers/organizations/datum-cloud';

const entityNav: EntityNav = {
  backTo: { label: 'Organizations', href: '/customers/organizations' },
  title: 'Datum Cloud',
  groups: [
    {
      items: [
        { label: 'Overview', href: ORG_ROOT },
        {
          label: 'Activity',
          icon: Activity,
          match: `${ORG_ROOT}/activity`,
          children: [
            { label: 'Feed', href: `${ORG_ROOT}/activity` },
            { label: 'Events', href: `${ORG_ROOT}/activity/events` },
          ],
        },
      ],
    },
  ],
};

describe('MiloSubNav — D1 nested collapsible groups', () => {
  beforeEach(() => {
    // The rail's collapsed/expanded *sidebar* preference persists via
    // localStorage (D3) — clear it so each test starts from the entity
    // rail's D4 default (expanded), independent of prior tests/runs.
    window.localStorage.clear();
  });

  // cy.mount wraps the component in <Route path={path} element={...}/> — a
  // wildcard path so it renders regardless of `initialEntries`, since these
  // tests deep-link past the default '/'.
  const mountAt = (pathname: string) =>
    cy.mount(<MiloSubNav nav={entityNav} />, { initialEntries: [pathname], path: '*' });

  it('auto-expands a group whose child matches the current URL', () => {
    mountAt(`${ORG_ROOT}/activity/events`);

    // Both children are visible without clicking anything.
    cy.contains('Feed').should('be.visible');
    cy.contains('Events').should('be.visible');
  });

  it('highlights the active child, not its siblings', () => {
    mountAt(`${ORG_ROOT}/activity/events`);

    cy.contains('a', 'Events').should('have.class', 'bg-card');
    cy.contains('a', 'Feed').should('not.have.class', 'bg-card');
  });

  it('stays collapsed when no child matches, and expands on click', () => {
    mountAt(ORG_ROOT);

    cy.contains('Feed').should('not.exist');
    cy.contains('Events').should('not.exist');

    cy.contains('button', 'Activity').click();

    cy.contains('Feed').should('be.visible');
    cy.contains('Events').should('be.visible');
  });

  it('renders the entity header (back-link + title) expanded by default (D4)', () => {
    mountAt(ORG_ROOT);

    cy.contains('Organizations').should('be.visible');
    cy.contains('Datum Cloud').should('be.visible');
  });
});
