import { type NavSection } from '../../lib/nav-config';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router';

interface MiloNavItemProps {
  section: NavSection;
  active: boolean;
}

/**
 * One top-level section in the global navbar. Clicking navigates to the section;
 * hovering opens a dropdown of its sub-items (mirrors the left sub-nav rail). The
 * dropdown uses a Popover (portaled) so it isn't clipped by the nav's horizontal
 * overflow scroll.
 */
export function MiloNavItem({ section, active }: MiloNavItemProps) {
  const hasDropdown = (section.subNav?.groups.length ?? 0) > 0;
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  // Small delay so the pointer can travel from the trigger to the panel (and
  // across the sideOffset gap) without the dropdown closing.
  const closeSoon = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => () => void (closeTimer.current && clearTimeout(closeTimer.current)), []);

  const link = (
    <NavLink
      to={section.href}
      onMouseEnter={hasDropdown ? openNow : undefined}
      onMouseLeave={hasDropdown ? closeSoon : undefined}
      onClick={() => setOpen(false)}
      className={cn(
        'flex items-center rounded-md border border-transparent px-2 py-0.5 whitespace-nowrap transition-colors',
        active || open ? 'bg-card text-primary' : 'text-foreground hover:bg-card hover:text-primary'
      )}>
      <span className="text-sm font-medium">{section.label}</span>
      {hasDropdown && (
        <ChevronDown
          className={cn('ml-1 size-3.5 opacity-60 transition-transform', open && 'rotate-180')}
        />
      )}
    </NavLink>
  );

  if (!hasDropdown) return link;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>{link}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        // Hover-driven menu: don't let Radix move focus into the panel on open
        // or back onto the trigger on close (the returned focus flashes the nav
        // link's focus outline, which looks like a stray border on mouse-leave).
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={openNow}
        onMouseLeave={closeSoon}
        // Dark panel in both themes: foreground (midnight-fjord) in light, a
        // raised popover navy in dark. Content is white since it always sits on
        // a dark surface.
        className="bg-foreground dark:bg-popover w-52 border-white/10 p-1 text-white">
        {section.subNav?.groups.map((group, gi) => (
          <div key={group.label ?? gi} className="flex flex-col">
            {group.label && (
              <Text size="xs" className="px-2 py-1 tracking-wide text-white/45 uppercase">
                {group.label}
              </Text>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-white/15 font-medium text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )
                }>
                {item.icon && <Icon icon={item.icon} className="shrink-0 text-white/60" />}
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
