'use client';

import { Button } from '@datum-cloud/datum-ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@datum-cloud/datum-ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

export interface GroupedSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface GroupedSelectAutocompleteProps {
  options: GroupedSelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  width?: string;
  maxHeight?: string;
  groupBy?: string;
}

export function GroupedSelectAutocomplete({
  options,
  value,
  onValueChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found.',
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  width = 'w-[200px]',
  maxHeight = 'max-h-[300px]',
  groupBy = 'group',
}: GroupedSelectAutocompleteProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find((option) => option.value === value);

  // Group options by the specified field
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, GroupedSelectOption[]> = {};

    options.forEach((option) => {
      const groupKey = (option as any)[groupBy] || 'Other';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(option);
    });

    // Sort groups alphabetically
    const sortedGroups = Object.keys(groups).sort();
    return sortedGroups.map((groupKey) => ({
      groupKey,
      options: groups[groupKey].sort((a, b) => a.label.localeCompare(b.label)),
    }));
  }, [options, groupBy]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          theme="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(width, 'justify-between overflow-hidden', triggerClassName, className)}>
          <span className="min-w-0 truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn(width, 'p-0', contentClassName)} align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList className={maxHeight}>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {groupedOptions.map(({ groupKey, options: groupOptions }) => (
              <CommandGroup key={groupKey}>
                <div className="text-muted-foreground bg-muted/50 rounded-sm px-2 py-1.5 text-sm font-semibold">
                  {groupKey}
                </div>
                {groupOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    onSelect={(currentValue) => {
                      if (onValueChange) {
                        onValueChange(currentValue === value ? '' : currentValue);
                      }
                      setOpen(false);
                    }}>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {(option as any).currentTimeFormat || option.label}
                      </span>
                    </div>
                    <Check
                      className={cn(
                        'ml-auto h-4 w-4',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
