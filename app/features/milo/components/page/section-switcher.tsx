import { type NavSubItem } from '../../lib/nav-config';
import { useActiveNav } from '../../lib/use-active-section';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

/**
 * Section switcher for the list search bar — stands in for the left sub-nav
 * rail on sections whose `subNav.placement` is `toolbar`. Lists the active
 * section's sub-nav items; the trigger names the current one.
 */
export function SectionSwitcher() {
  const { section, subItem } = useActiveNav();
  const [open, setOpen] = useState(false);
  if (!section?.subNav) return null;

  // Groups with children (D1) flatten to their children — those are the destinations.
  const items = section.subNav.groups
    .flatMap((g) => g.items)
    .flatMap((item): NavSubItem[] => item.children ?? [item])
    .filter((item) => item.href);
  const current = subItem ?? items[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hover:bg-muted text-foreground flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 transition-colors">
          {current?.icon && (
            <Icon icon={current.icon} className="text-muted-foreground size-4 shrink-0" />
          )}
          <Text as="span" size="sm" weight="medium">
            {current?.label ?? section.label}
          </Text>
          <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        {items.map((item) => {
          const active = item === current;
          return (
            <Link
              key={item.href}
              to={item.href ?? ''}
              onClick={() => setOpen(false)}
              className={cn(
                'hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}>
              {item.icon && <Icon icon={item.icon} className="size-4 shrink-0" />}
              <Text as="span" size="sm" weight={active ? 'medium' : 'normal'} className="flex-1">
                {item.label}
              </Text>
              {active && <Check className="size-4 shrink-0" />}
            </Link>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
