import { type NavSubItem } from '../../lib/nav-config';
import { useActiveNav, useNavSections } from '../../lib/use-active-section';
import { useEntityNav } from '../../lib/use-entity-nav';
import { miloIconButtonClass } from './milo-icon-button';
import { LogoIcon } from '@/components/logo/logo-icon';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@datum-cloud/datum-ui/sheet';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import { ArrowLeft, Menu } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router';

const itemLinkClass =
  'flex items-center gap-2 rounded-md py-1.5 pr-3 pl-9 text-sm transition-colors';
const itemIdleClass = 'text-muted-foreground hover:bg-card hover:text-primary';
const itemActiveClass = 'bg-card text-primary';

/**
 * One sub-nav row. An item with `children` (D1's nested groups, entity rail
 * only) isn't itself a link — a plain group header, its children listed
 * indented below (no collapse/expand here, unlike the desktop rail — a
 * mobile sheet already closes on tap, so there's nothing to save space for).
 */
function MobileNavItem({ item, onNavigate }: { item: NavSubItem; onNavigate: () => void }) {
  if (item.children?.length) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="text-muted-foreground py-1.5 pr-3 pl-9 text-xs font-medium tracking-wide uppercase">
          {item.label}
        </div>
        {item.children.map((child) => (
          <NavLink
            key={child.href}
            to={child.href ?? ''}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(itemLinkClass, 'pl-12', isActive ? itemActiveClass : itemIdleClass)
            }>
            {child.label}
          </NavLink>
        ))}
      </div>
    );
  }

  return (
    <NavLink
      to={item.href ?? ''}
      onClick={onNavigate}
      className={({ isActive }) => cn(itemLinkClass, isActive ? itemActiveClass : itemIdleClass)}>
      {item.icon && <Icon icon={item.icon} className="shrink-0" />}
      {item.label}
    </NavLink>
  );
}

/**
 * Mobile main menu: a hamburger that opens a left slide-in sheet. Shown only
 * below `md` (the horizontal navbar menu takes over above).
 *
 * When an entity nav is active (`handle.entityNav`, #656/#775 — same as the
 * desktop left rail), the sheet opens on the entity's own items instead of
 * the global sections, with a back affordance to reach them — mirroring
 * what the rail does above `md`. Off an entity route, it's just the section
 * list, as before.
 */
export function MiloMobileMenu({ className }: { className?: string }) {
  const { t } = useLingui();
  const sections = useNavSections();
  const { section: active } = useActiveNav();
  const entityNav = useEntityNav();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'entity' | 'sections'>(entityNav ? 'entity' : 'sections');

  // Re-resolve the default view each time the sheet opens, rather than an
  // effect watching `entityNav` — the sheet is closed between navigations,
  // so this is the one moment that matters.
  const handleOpenChange = (next: boolean) => {
    if (next) setView(entityNav ? 'entity' : 'sections');
    setOpen(next);
  };
  const closeMenu = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          htmlType="button"
          type="tertiary"
          theme="borderless"
          size="icon"
          aria-label={t`Open menu`}
          className={cn(miloIconButtonClass, className)}>
          <Icon icon={Menu} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2">
            <LogoIcon width={20} />
            {t`Menu`}
          </SheetTitle>
        </SheetHeader>

        {entityNav && view === 'entity' ? (
          <nav className="flex flex-col gap-1 overflow-y-auto p-3">
            <button
              type="button"
              onClick={() => setView('sections')}
              className="text-muted-foreground hover:text-primary flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors">
              <ArrowLeft className="size-3.5" />
              {t`All sections`}
            </button>
            <div className="flex items-center gap-2 px-3 py-2">
              {entityNav.icon && <Icon icon={entityNav.icon} className="shrink-0" />}
              <span className="truncate text-sm font-semibold">{entityNav.title}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {entityNav.groups
                .flatMap((g) => g.items)
                .map((item) => (
                  <MobileNavItem key={item.href ?? item.label} item={item} onNavigate={closeMenu} />
                ))}
            </div>
          </nav>
        ) : (
          <nav className="flex flex-col gap-4 overflow-y-auto p-3">
            {entityNav && (
              <button
                type="button"
                onClick={() => setView('entity')}
                className="text-muted-foreground hover:text-primary flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors">
                <ArrowLeft className="size-3.5" />
                <span className="truncate">{entityNav.title}</span>
              </button>
            )}
            {sections.map((section) => {
              const items = section.subNav?.groups.flatMap((g) => g.items) ?? [];
              return (
                <div key={section.id} className="flex flex-col gap-0.5">
                  {/* Section header — navigates to the section's default page. */}
                  <NavLink
                    to={section.href}
                    onClick={closeMenu}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 text-sm font-semibold transition-colors',
                      active?.id === section.id ? 'text-primary' : 'text-foreground'
                    )}>
                    <Icon icon={section.icon} className="shrink-0" />
                    {section.label}
                  </NavLink>
                  {/* Sub-items (parity with the desktop dropdown / left rail). */}
                  {items.map((item) => (
                    <MobileNavItem
                      key={item.href ?? item.label}
                      item={item}
                      onNavigate={closeMenu}
                    />
                  ))}
                </div>
              );
            })}
          </nav>
        )}
      </SheetContent>
    </Sheet>
  );
}
