import { CommandGroup, CommandItem } from '@datum-cloud/datum-ui/command';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface SearchResultGroupProps<T> {
  heading: string;
  items: T[];
  icon: LucideIcon;
  /** Optional color class for the icon (e.g. "text-green-600") */
  iconClassName?: string;
  getKey: (item: T) => string;
  getValue: (item: T) => string;
  getTitle: (item: T) => string;
  getSubtitle: (item: T) => string;
  getDetail?: (item: T) => string;
  onSelect: (item: T) => void;
  /** Optional footer element rendered below the group items (e.g. "See all →" link) */
  footer?: ReactNode;
}

export const SearchResultGroup = <T,>({
  heading,
  items,
  icon,
  iconClassName,
  getKey,
  getValue,
  getTitle,
  getSubtitle,
  getDetail,
  onSelect,
  footer,
}: SearchResultGroupProps<T>) => {
  const { t } = useLingui();

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <CommandGroup heading={t`${heading}`}>
      {items.map((item) => {
        const Icon = icon;
        return (
          <CommandItem
            key={getKey(item)}
            value={getValue(item)}
            className="cursor-pointer"
            onSelect={() => onSelect(item)}>
            <Icon className={cn('mt-0.5 mr-2 h-4 w-4 shrink-0 self-start', iconClassName)} />
            <div className="flex min-w-0 flex-col">
              <Text className="truncate">{getTitle(item)}</Text>
              {getSubtitle(item) && (
                <Text size="xs" textColor="muted" className="truncate">
                  {getSubtitle(item)}
                </Text>
              )}
              {getDetail && getDetail(item) && (
                <Text size="xs" textColor="muted" className="truncate opacity-60">
                  {getDetail(item)}
                </Text>
              )}
            </div>
          </CommandItem>
        );
      })}
      {footer}
    </CommandGroup>
  );
};
