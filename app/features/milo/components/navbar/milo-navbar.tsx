import { NAVBAR_H } from '../../lib/dimensions';
import { NAV_SECTIONS } from '../../lib/nav-config';
import { useActiveNav } from '../../lib/use-active-section';
import { MiloMobileMenu } from './milo-mobile-menu';
import { MiloNavItem } from './milo-nav-item';
import { MiloRightCluster } from './milo-right-cluster';
import { LogoIcon } from '@/components/logo/logo-icon';
import { useLingui } from '@lingui/react/macro';
import { Link } from 'react-router';

/**
 * Region ① — the global navbar (#771). Logo (left), horizontal main menu
 * (center-left), right cluster. Sticky to the top of the viewport. Below `md`
 * the horizontal menu collapses into the hamburger sheet (MiloMobileMenu).
 */
export function MiloNavbar() {
  const { t } = useLingui();
  const { section: activeSection } = useActiveNav();

  return (
    <header
      style={{ height: NAVBAR_H }}
      className="bg-background sticky top-0 z-30 flex shrink-0 items-center gap-4 border-b px-4 md:px-6">
      <MiloMobileMenu className="md:hidden" />

      <Link to="/" className="flex shrink-0 items-center" aria-label={t`Home`}>
        <LogoIcon width={20} />
      </Link>

      <nav className="hidden min-w-0 flex-1 items-center gap-2 overflow-x-auto md:flex">
        {NAV_SECTIONS.map((section) => (
          <MiloNavItem
            key={section.id}
            section={section}
            active={activeSection?.id === section.id}
          />
        ))}
      </nav>

      {/* Spacer pushes the right cluster to the edge on mobile, where the nav
          (which carries flex-1 on desktop) is hidden. */}
      <div className="flex-1 md:hidden" />

      <MiloRightCluster />
    </header>
  );
}
