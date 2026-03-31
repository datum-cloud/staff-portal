'use client';

import { Button } from '@datum-cloud/datum-ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@datum-cloud/datum-ui/command';
import { Form } from '@datum-cloud/datum-ui/form';
import { Input } from '@datum-cloud/datum-ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import * as React from 'react';

export type FormAutosearchOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type FormAutosearchProps = {
  name: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  required?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  modal?: boolean;
  options: FormAutosearchOption[];
  loading?: boolean;
  onSearch?: (query: string) => void;
  searchDebounceMs?: number;
  getSearchValue?: (option: FormAutosearchOption) => string;
};

const defaultSearchValue = (option: FormAutosearchOption) =>
  [option.label, option.description, option.value].filter(Boolean).join(' ');

export function FormAutosearch({
  name,
  label,
  description,
  required = false,
  placeholder = 'Search for an option',
  emptyMessage = 'No results found.',
  disabled = false,
  className,
  contentClassName,
  modal = false,
  options,
  loading = false,
  onSearch,
  searchDebounceMs = 300,
  getSearchValue = defaultSearchValue,
}: FormAutosearchProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [searchExecuted, setSearchExecuted] = React.useState(false);
  const [persistedOption, setPersistedOption] = React.useState<FormAutosearchOption | null>(null);
  const controlRef = React.useRef<{
    value: unknown;
    change: (value: unknown) => void;
    blur: () => void;
  } | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const normalizedQuery = searchQuery.trim();

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const queueSearch = React.useCallback(
    (nextValue: string) => {
      setSearchQuery(nextValue);
      const normalized = nextValue.trim();

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      if (!normalized) {
        onSearch?.('');
        setOpen(false);
        setSearchExecuted(false);
        return;
      }

      setOpen(true);
      debounceRef.current = setTimeout(() => {
        setSearchExecuted(true);
        onSearch?.(normalized);
        debounceRef.current = null;
      }, searchDebounceMs);
    },
    [onSearch, searchDebounceMs]
  );

  const clearSearch = React.useCallback(() => {
    setSearchQuery('');
    setSearchExecuted(false);
    onSearch?.('');
    setOpen(false);
  }, [onSearch]);

  React.useEffect(() => {
    const control = controlRef.current;
    const currentValue = (control?.value as string | undefined) ?? '';
    if (currentValue || !normalizedQuery) {
      return;
    }

    if (options.length === 1 && !options[0].disabled) {
      setPersistedOption(options[0]);
      control?.change(options[0].value);
      control?.blur();
      clearSearch();
    }
  }, [clearSearch, normalizedQuery, options]);

  return (
    <Form.Field
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}>
      {({ control, meta }) => {
        controlRef.current = control;
        const hasSearch = Boolean(normalizedQuery);
        const currentValue = (control.value as string | undefined) ?? '';
        const selectedOption =
          options.find((option) => option.value === currentValue) ?? persistedOption;
        const showResults = hasSearch && !currentValue && options.length > 1;
        const showNoResults = hasSearch && !loading && options.length === 0 && searchExecuted;

        const handleSelect = (option: FormAutosearchOption) => {
          setPersistedOption(option);
          control.change(option.value);
          control.blur();
          clearSearch();
        };

        const handleClearSelected = () => {
          setPersistedOption(null);
          control.change('');
          clearSearch();
        };

        return (
          <>
            {currentValue ? (
              <div className="border-border bg-muted/10 flex items-center justify-between gap-2 rounded-md border px-3 py-1 pr-1">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {selectedOption?.label ?? currentValue}
                  </span>
                  {selectedOption?.description && (
                    <span className="text-muted-foreground text-xs">
                      {selectedOption.description}
                    </span>
                  )}
                </div>
                <Button
                  size="small"
                  type="tertiary"
                  theme="borderless"
                  disabled={disabled}
                  onClick={handleClearSelected}>
                  Clear
                </Button>
              </div>
            ) : (
              <Popover open={open && showResults} onOpenChange={setOpen} modal={modal}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Input
                      placeholder={placeholder}
                      value={searchQuery}
                      disabled={disabled}
                      autoComplete="off"
                      className="w-full pr-10"
                      onChange={(event) => queueSearch(event.target.value)}
                    />
                    {loading && (
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
                </PopoverTrigger>
                <PopoverContent
                  className={cn('p-0', contentClassName)}
                  side="bottom"
                  align="start"
                  onOpenAutoFocus={(event) => event.preventDefault()}>
                  <Command>
                    <CommandList>
                      {loading ? (
                        <CommandEmpty>Searching...</CommandEmpty>
                      ) : options.length === 0 ? (
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {options.map((option) => (
                            <CommandItem
                              key={option.value}
                              value={getSearchValue(option)}
                              disabled={option.disabled}
                              onSelect={() => handleSelect(option)}>
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
                                  currentValue === option.value ? 'opacity-100' : 'opacity-0'
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

            {meta.errors.length > 0 ? <Form.Error>{meta.errors[0]}</Form.Error> : null}
          </>
        );
      }}
    </Form.Field>
  );
}
