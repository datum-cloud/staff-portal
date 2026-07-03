import { NAV_SECTIONS } from '../../lib/nav-config';
import { useActiveNav } from '../../lib/use-active-section';
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
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router';

/**
 * Mobile main menu: a hamburger that opens a left slide-in sheet listing the top
 * sections. Shown only below `md` (the horizontal navbar menu takes over above).
 */
export function MiloMobileMenu({ className }: { className?: string }) {
  const { t } = useLingui();
  const { section: active } = useActiveNav();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
        <nav className="flex flex-col gap-4 overflow-y-auto p-3">
          {NAV_SECTIONS.map((section) => {
            const items = section.subNav?.groups.flatMap((g) => g.items) ?? [];
            return (
              <div key={section.id} className="flex flex-col gap-0.5">
                {/* Section header — navigates to the section's default page. */}
                <NavLink
                  to={section.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 text-sm font-semibold transition-colors',
                    active?.id === section.id ? 'text-primary' : 'text-foreground'
                  )}>
                  <Icon icon={section.icon} className="shrink-0" />
                  {section.label}
                </NavLink>
                {/* Sub-items (parity with the desktop dropdown / left rail). */}
                {items.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-md py-1.5 pr-3 pl-9 text-sm transition-colors',
                        isActive
                          ? 'bg-card text-primary'
                          : 'text-muted-foreground hover:bg-card hover:text-primary'
                      )
                    }>
                    {item.icon && <Icon icon={item.icon} className="shrink-0" />}
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
