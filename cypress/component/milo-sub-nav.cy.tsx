import { MiloSubNav } from '@/features/milo/components/sub-nav/milo-sub-nav';
import { type EntityNav, type NavSubNav } from '@/features/milo/lib/nav-config';
import { Activity } from 'lucide-react';
import { useState } from 'react';

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

// Regression: MiloShell renders `<MiloSubNav nav={...}>` at the same tree
// position/type whether it's showing a section's rail or an entity's — a
// client-side navigation between them (e.g. the Customers list -> an org
// detail page) re-renders MiloSubNav, it does not remount it. A collapsed
// state that was only ever set from the *first* `defaultCollapsed` it saw
// would silently keep the entity rail collapsed on every first visit,
// hiding every label (#676 CI failure).
const sectionNav: NavSubNav = {
  defaultCollapsed: true,
  groups: [{ items: [{ label: 'Organizations', href: '/customers/organizations' }] }],
};

function SectionThenEntity() {
  const [nav, setNav] = useState<NavSubNav | EntityNav>(sectionNav);
  return (
    <div>
      <button type="button" onClick={() => setNav(entityNav)}>
        Go to org
      </button>
      <MiloSubNav nav={nav} />
    </div>
  );
}

describe('MiloSubNav — collapsed state does not leak across a nav-type switch', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the entity rail's own expanded default (D4), even though the prior section rail was collapsed", () => {
    cy.mount(<SectionThenEntity />, { path: '*' });

    // Sanity: the section rail starts collapsed (icon-only) per its own default.
    cy.contains('Organizations').should('not.exist');

    cy.contains('button', 'Go to org').click();

    // Same MiloSubNav instance, now showing the entity rail — its own D4
    // default (expanded) applies, not the section rail's collapsed state.
    cy.contains('Overview').should('be.visible');
    cy.contains('Datum Cloud').should('be.visible');
  });
});
