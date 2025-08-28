import { CommandGroup, CommandItem } from '@/modules/shadcn/ui/command';
import { Organization, Project, User } from '@/resources/schemas';
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
  onSelect: (item: T) => void;
}

export const SearchResultGroup = <T extends { metadata: { name: string } }>({
  heading,
  items,
  icon,
  getValue,
  getTitle,
  getSubtitle,
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
            key={item.metadata.name}
            value={getValue(item)}
            onSelect={() => onSelect(item)}>
            <Icon className="mr-2 h-4 w-4" />
            <Text>{getTitle(item)}</Text>
            {getSubtitle(item) && (
              <Text size="xs" textColor="muted" className="ml-auto">
                {getSubtitle(item)}
              </Text>
            )}
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
};
