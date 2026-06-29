import { useActiveNav } from '../../lib/use-active-section';
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
 * Navbar and context bar are always present; the sub-nav rail appears only when
 * the active section declares one. Independent of datum-ui's SidebarProvider.
 */
export function MiloShell() {
  const { section, subItem } = useActiveNav();

  return (
    <div className="bg-background flex min-h-svh w-full flex-col">
      <MiloNavbar />
      <MiloContextBar />
      <div className="flex flex-1">
        {section?.subNav && <MiloSubNav subNav={section.subNav} activeItem={subItem} />}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
