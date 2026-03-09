'use client';

import type { AutocompleteOption } from './form-autocomplete';
import { useFormContext } from './form-context';
import { cn } from '@/modules/shadcn/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/modules/shadcn/ui/command';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/modules/shadcn/ui/form';
import { Input } from '@/modules/shadcn/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/modules/shadcn/ui/popover';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Button } from '@datum-cloud/datum-ui/button';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import * as React from 'react';

const defaultAutosearchValue = (option: AutocompleteOption) =>
  [option.label, option.description, option.value].filter(Boolean).join(' ');

interface FormAutosearchProps {
  field: string;
  label?: string;
  description?: string;
  required?: boolean;
  hideError?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  modal?: boolean;
  options: AutocompleteOption[];
  isLoading?: boolean;
  onSearch?: (query: string) => void;
  searchDebounceMs?: number;
  getValue?: (option: AutocompleteOption) => string;
  rules?: {
    required?: boolean | string;
    validate?: (value: any) => boolean | string | Promise<boolean | string>;
  };
}

export const FormAutosearch: React.FC<FormAutosearchProps> = ({
  field,
  label,
  description,
  required = false,
  hideError = false,
  placeholder = 'Search for an option',
  emptyMessage = 'No results found.',
  disabled = false,
  className,
  contentClassName,
  modal = false,
  options = [],
  isLoading = false,
  onSearch,
  searchDebounceMs = 300,
  getValue = defaultAutosearchValue,
  rules,
}) => {
  const form = useFormContext();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const fieldRef = React.useRef<{
    value: string;
    onChange: (value: string) => void;
  } | null>(null);
  const [persistedOption, setPersistedOption] = React.useState<AutocompleteOption | null>(null);
  const [searchExecuted, setSearchExecuted] = React.useState(false);

  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const normalized = value.trim();
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }

    if (!normalized) {
      onSearch?.('');
      setOpen(false);
      setSearchExecuted(false);
      return;
    }

    setOpen(true);
    searchDebounceRef.current = setTimeout(() => {
      setSearchExecuted(true);
      onSearch?.(normalized);
      searchDebounceRef.current = null;
    }, searchDebounceMs);
  };

  React.useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
    };
  }, []);

  const normalizedQuery = searchQuery.trim();
  const handleSelect = React.useCallback(
    (option: AutocompleteOption) => {
      setPersistedOption(option);
      fieldRef.current?.onChange(option.value);
      setSearchQuery('');
      onSearch?.('');
      setOpen(false);
    },
    [onSearch]
  );

  const handleClear = React.useCallback(() => {
    setPersistedOption(null);
    setSearchQuery('');
    onSearch?.('');
    setOpen(false);
    setSearchExecuted(false);
    fieldRef.current?.onChange('');
    form.form.clearErrors(field);
  }, [field, form.form, onSearch]);

  React.useEffect(() => {
    const fieldValue = fieldRef.current?.value;
    if (fieldValue || !normalizedQuery) {
      return;
    }

    if (options.length === 1 && !options[0].disabled) {
      handleSelect(options[0]);
    }
  }, [normalizedQuery, options, handleSelect]);

  return (
    <FormField
      control={form.form.control}
      name={field}
      rules={{
        ...rules,
        ...(required && { required: required === true ? 'This field is required' : required }),
      }}
      render={({ field: fieldProps, fieldState: { error } }) => {
        fieldRef.current = fieldProps;
        const hasSearch = Boolean(normalizedQuery);
        const showResults = hasSearch && !fieldProps.value && options.length > 1;
        const selectedOption =
          options.find((option) => option.value === fieldProps.value) ?? persistedOption;
        const selectedLabel = selectedOption?.label ?? '';
        const selectedDescription = selectedOption?.description ?? '';
        const showNoResults = hasSearch && !isLoading && options.length === 0 && searchExecuted;

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

            {fieldProps.value ? (
              <div className="border-border bg-muted/10 flex items-center justify-between gap-2 rounded-md border px-3 py-1 pr-1">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{selectedLabel}</span>
                  {selectedDescription && (
                    <span className="text-muted-foreground text-xs">{selectedDescription}</span>
                  )}
                </div>
                <Button
                  size="small"
                  type="tertiary"
                  theme="borderless"
                  onClick={handleClear}
                  disabled={disabled}>
                  Clear
                </Button>
              </div>
            ) : (
              <Popover open={open && showResults} onOpenChange={setOpen} modal={modal}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder={placeholder}
                        value={searchQuery}
                        onChange={(event) => handleSearchChange(event.target.value)}
                        disabled={disabled}
                        autoComplete="off"
                        className="w-full pr-10"
                      />
                      {isLoading && (
                        <Loader2 className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
                      )}
                      {showNoResults && (
                        <Tooltip message={emptyMessage}>
                          <span className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2">
                            <AlertCircle className="text-destructive h-4 w-4" />
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent
                  className={cn('p-0', contentClassName)}
                  side="bottom"
                  align="start"
                  onOpenAutoFocus={(event) => event.preventDefault()}>
                  <Command>
                    <CommandList>
                      {isLoading ? (
                        <CommandEmpty>Searching...</CommandEmpty>
                      ) : options.length === 0 ? (
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {options.map((option) => (
                            <CommandItem
                              key={option.value}
                              value={getValue(option)}
                              onSelect={() => handleSelect(option)}
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
                                  fieldProps.value === option.value ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}

            {!hideError && error && <FormMessage>{error.message}</FormMessage>}
          </FormItem>
        );
      }}
    />
  );
};
