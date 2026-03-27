'use client';

import { useFormContext } from './form-context';
import { cn } from '@datum-cloud/datum-ui/utils';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/modules/shadcn/ui/form';
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
import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

const defaultAutocompleteFilterValue = (option: AutocompleteOption) => {
  return [option.label, option.description, option.value].filter(Boolean).join(' ');
};

interface FormAutocompleteProps {
  field: string;
  label?: string;
  description?: string;
  required?: boolean;
  hideError?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  modal?: boolean;
  // Simple props approach
  options: AutocompleteOption[];
  isLoading?: boolean;
  onSearch?: (query: string) => void;
  searchDebounceMs?: number;
  /**
   * Returns the string that cmdk should filter on for each option.
   */
  getValue?: (option: AutocompleteOption) => string;
  rules?: {
    required?: boolean | string;
    validate?: (value: any) => boolean | string | Promise<boolean | string>;
  };
}

export const FormAutocomplete: React.FC<FormAutocompleteProps> = ({
  field,
  label,
  description,
  required = false,
  hideError = false,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  modal = false,
  options = [],
  isLoading = false,
  onSearch,
  searchDebounceMs = 300,
  getValue = defaultAutocompleteFilterValue,
  rules,
}) => {
  const form = useFormContext();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Debounced search function
  const debouncedSearch = React.useCallback(
    (query: string) => {
      const timeoutId = setTimeout(() => {
        if (onSearch) {
          onSearch(query);
        }
      }, searchDebounceMs);

      return () => clearTimeout(timeoutId);
    },
    [onSearch, searchDebounceMs]
  );

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Call debounced search function
    debouncedSearch(value);
  };

  // Load initial data when component mounts and clear search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery('');
    } else if (onSearch && searchQuery === '') {
      // Load initial data when dropdown opens for the first time
      onSearch('');
    }
  }, [open, onSearch, searchQuery]);

  return (
    <FormField
      control={form.form.control}
      name={field}
      rules={{
        ...rules,
        ...(required && { required: required === true ? 'This field is required' : required }),
      }}
      render={({ field: fieldProps, fieldState: { error } }) => {
        const selectedOption = options.find((option) => option.value === fieldProps.value);

        // Handle option selection
        const handleSelect = (value: string) => {
          fieldProps.onChange(value === fieldProps.value ? '' : value);
          setOpen(false);
        };

        return (
          <FormItem className={cn('flex flex-col', className)}>
            {label && (
              <FormLabel
                className={
                  required ? 'after:text-destructive after:ml-0.5 after:content-["*"]' : ''
                }>
                {label}
              </FormLabel>
            )}
            {description && <FormDescription>{description}</FormDescription>}
            <Popover open={open} onOpenChange={setOpen} modal={modal}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    theme="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-invalid={!!error}
                    className={cn(
                      'justify-between',
                      !selectedOption && 'text-muted-foreground',
                      triggerClassName
                    )}
                    disabled={disabled || isLoading}>
                    <span className="flex-1 truncate text-left">
                      {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className={cn('p-0', contentClassName)} side="bottom" align="start">
                <Command>
                  <CommandInput
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onValueChange={handleSearchChange}
                  />
                  <CommandList>
                    <CommandEmpty>{emptyMessage}</CommandEmpty>
                    <CommandGroup>
                      {options.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={getValue(option)}
                          onSelect={() => handleSelect(option.value)}
                          disabled={option.disabled}>
                          <div className="flex flex-col">
                            <span className="font-medium">{option.label}</span>
                            {option.description && (
                              <span className="text-muted-foreground text-xs">
                                {option.description}
                              </span>
                            )}
                          </div>
                          <Check
                            className={cn(
                              'ml-auto h-4 w-4',
                              selectedOption?.value === option.value ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {!hideError && <FormMessage />}
          </FormItem>
        );
      }}
    />
  );
};
