import { CommandGroup, CommandItem } from '@/modules/shadcn/ui/command';
import { Text } from '@datum-ui/typography';
import { useLingui } from '@lingui/react/macro';
import { LucideIcon } from 'lucide-react';

interface SearchResultGroupProps<T> {
  heading: string;
  items: T[];
  icon: LucideIcon;
  getValue: (item: T) => string;
  getTitle: (item: T) => string;
  getSubtitle: (item: T) => string;
  getDetail?: (item: T) => string;
  onSelect: (item: T) => void;
}

export const SearchResultGroup = <T extends { metadata?: { name?: string } }>({
  heading,
  items,
  icon,
  getValue,
  getTitle,
  getSubtitle,
  getDetail,
  onSelect,
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
            key={item.metadata?.name ?? ''}
            value={getValue(item)}
            className="cursor-pointer"
            onSelect={() => onSelect(item)}>
            <Icon className="mt-0.5 mr-2 h-4 w-4 shrink-0 self-start" />
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
    </CommandGroup>
  );
};
