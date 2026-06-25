import { NAV_SECTIONS } from '../../lib/nav-config';
import { useActiveNav } from '../../lib/use-active-section';
import { miloIconButtonClass } from './milo-icon-button';
import { LogoIcon } from '@/components/logo/logo-icon';
import { Button } from '@datum-cloud/datum-ui/button';
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
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2">
            <LogoIcon width={20} />
            {t`Menu`}
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-2">
          {NAV_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = active?.id === section.id;
            return (
              <NavLink
                key={section.id}
                to={section.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-md border border-transparent px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-card border-border text-primary'
                    : 'text-foreground hover:bg-card hover:border-border hover:text-primary'
                )}>
                <Icon className="size-4 shrink-0" />
                {section.label}
              </NavLink>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
