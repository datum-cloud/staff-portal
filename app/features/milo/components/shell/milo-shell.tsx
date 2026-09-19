import { useActiveNav } from '../../lib/use-active-section';
import { useEntityNav } from '../../lib/use-entity-nav';
import { MiloContextBar } from '../context-bar/milo-context-bar';
import { MiloNavbar } from '../navbar/milo-navbar';
import { MiloSubNav } from '../sub-nav/milo-sub-nav';
import { Outlet } from 'react-router';

/**
 * The Milo app shell. Composes the fixed regions around the routed page:
 *
 *   ┌ MiloNavbar (main menu) ───────────────────────────┐
 *   ├ MiloContextBar (breadcrumb) ──────────────────────┤
 *   │ MiloSubNav │ <Outlet/> (page renders a template)  │
 *   └────────────┴──────────────────────────────────────┘
 *
 * Navbar and context bar are always present. The rail shows the active
 * route's entity nav (`handle.entityNav`, #656/#775) when the current route
 * declares one, else the active section's `subNav`, else nothing —
 * independent of datum-ui's SidebarProvider.
 */
export function MiloShell() {
  const { section } = useActiveNav();
  const entityNav = useEntityNav();
  const nav = entityNav ?? section?.subNav;

  return (
    <div className="bg-background flex min-h-svh w-full flex-col">
      <MiloNavbar />
      <MiloContextBar />
      <div className="flex flex-1">
        {nav && <MiloSubNav nav={nav} />}
        <main className="bg-card flex min-w-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
