'use client';

import { useFormContext } from './form-context';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/modules/shadcn/ui/form';
import { Button } from '@datum-cloud/datum-ui/button';
import { Input } from '@datum-cloud/datum-ui/input';
import { cn } from '@datum-cloud/datum-ui/utils';
import { SearchIcon, X } from 'lucide-react';
import * as React from 'react';

export interface TransferOption {
  value: string | number;
  label: string;
  description?: string;
  disabled?: boolean;
  key?: string | number;
}

export interface TransferGroup {
  title: string;
  children: TransferOption[];
}

interface FormTransferProps {
  field: string;
  label?: string;
  description?: string;
  required?: boolean;
  hideError?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  // Data props
  dataSource: TransferOption[] | TransferGroup[];
  type?: 'list' | 'groupList';
  // Search props
  filter?: boolean | ((input: string, item: TransferOption) => boolean);
  onSearch?: (inputValue: string) => void;
  // Custom rendering
  renderSourceItem?: (item: TransferOption & { onChange: () => void }) => React.ReactNode;
  renderSelectedItem?: (item: TransferOption & { onRemove: () => void }) => React.ReactNode;
  renderSourceHeader?: (props: {
    searchValue: string;
    onSearchChange: (value: string) => void;
  }) => React.ReactNode;
  renderSelectedHeader?: (props: { count: number }) => React.ReactNode;
  // Callbacks
  onSelect?: (item: TransferOption) => void;
  onDeselect?: (item: TransferOption) => void;
  // Styling
  width?: number | string;
  height?: number | string;
  // Validation
  rules?: {
    required?: boolean | string;
    validate?: (value: any) => boolean | string | Promise<boolean | string>;
  };
}

const defaultFilter = (input: string, item: TransferOption): boolean => {
  const searchLower = input.toLowerCase();
  return (
    item.label.toLowerCase().includes(searchLower) ||
    item.description?.toLowerCase().includes(searchLower) ||
    String(item.value).toLowerCase().includes(searchLower)
  );
};

const flattenOptions = (dataSource: TransferOption[] | TransferGroup[]): TransferOption[] => {
  if (dataSource.length === 0) return [];

  // Check if it's grouped data
  const firstItem = dataSource[0];
  if ('children' in firstItem && 'title' in firstItem) {
    return (dataSource as TransferGroup[]).flatMap((group) => group.children);
  }

  return dataSource as TransferOption[];
};

export const FormTransfer: React.FC<FormTransferProps> = ({
  field,
  label,
  description,
  required = false,
  hideError = false,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  disabled = false,
  className,
  dataSource = [],
  type = 'list',
  filter = true,
  onSearch,
  renderSourceItem,
  renderSelectedItem,
  renderSourceHeader,
  renderSelectedHeader,
  onSelect,
  onDeselect,
  width = 568,
  height = 416,
  rules,
}) => {
  const form = useFormContext();
  const [searchValue, setSearchValue] = React.useState('');
  const [localSearchValue, setLocalSearchValue] = React.useState('');

  // Debounced search effect
  React.useEffect(() => {
    if (!onSearch) return;

    const timeoutId = setTimeout(() => {
      onSearch(localSearchValue);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localSearchValue, onSearch]);

  const handleSearchChange = (value: string) => {
    setLocalSearchValue(value);
    if (typeof filter === 'function' || filter === true) {
      setSearchValue(value);
    }
  };

  // Determine filter function
  const filterFn = React.useMemo(() => {
    if (filter === false) return null;
    if (typeof filter === 'function') return filter;
    return defaultFilter;
  }, [filter]);

  return (
    <FormField
      control={form.form.control}
      name={field}
      rules={{
        ...rules,
        ...(required && { required: required === true ? 'This field is required' : required }),
      }}
      render={({ field: fieldProps, fieldState: { error } }) => {
        const selectedValues = Array.isArray(fieldProps.value) ? fieldProps.value : [];

        // Flatten options for easier processing
        const allOptions = flattenOptions(dataSource);

        // Get selected options
        const selectedOptions = allOptions.filter((option) =>
          selectedValues.includes(option.value)
        );

        // Get source options (not selected)
        const sourceOptions = allOptions.filter((option) => !selectedValues.includes(option.value));

        // Filter source options based on search
        const filteredSourceOptions = filterFn
          ? sourceOptions.filter((option) => filterFn(searchValue, option))
          : sourceOptions;

        // Handle selection
        const handleSelect = (option: TransferOption) => {
          if (option.disabled) return;
          const newValues = [...selectedValues, option.value];
          fieldProps.onChange(newValues);
          onSelect?.(option);
        };

        // Handle deselection
        const handleDeselect = (option: TransferOption) => {
          const newValues = selectedValues.filter((v) => v !== option.value);
          fieldProps.onChange(newValues);
          onDeselect?.(option);
        };

        // Handle select all
        const handleSelectAll = () => {
          const selectableOptions = filteredSourceOptions.filter((opt) => !opt.disabled);
          const newValues = [...selectedValues, ...selectableOptions.map((opt) => opt.value)];
          fieldProps.onChange([...new Set(newValues)]);
        };

        // Handle deselect all
        const handleDeselectAll = () => {
          fieldProps.onChange([]);
        };

        const allSelected =
          filteredSourceOptions.length > 0 &&
          filteredSourceOptions.every((opt) => selectedValues.includes(opt.value) || opt.disabled);

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
            <FormControl>
              <div
                className={cn('overflow-hidden rounded-lg border', error && 'border-destructive')}
                style={{ width, height }}>
                <div className="flex h-full">
                  {/* Source Panel */}
                  <div className="flex flex-1 flex-col border-r">
                    {renderSourceHeader ? (
                      renderSourceHeader({
                        searchValue: localSearchValue,
                        onSearchChange: handleSearchChange,
                      })
                    ) : (
                      <div className="border-b p-3">
                        <div className="mb-2 flex min-h-[2.25rem] items-center justify-between">
                          <span className="text-sm font-medium">
                            {filteredSourceOptions.length} items
                          </span>
                          {filteredSourceOptions.length > 0 && (
                            <Button
                              htmlType="button"
                              theme="borderless"
                              size="small"
                              onClick={handleSelectAll}
                              disabled={disabled || allSelected}>
                              Select All
                            </Button>
                          )}
                        </div>
                        {filter !== false && (
                          <div className="relative">
                            <SearchIcon className="text-muted-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2" />
                            <Input
                              placeholder={searchPlaceholder}
                              value={localSearchValue}
                              onChange={(e) => handleSearchChange(e.target.value)}
                              disabled={disabled}
                              className="pl-8"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto p-2">
                      {type === 'groupList' && 'children' in (dataSource[0] || {}) ? (
                        // Render grouped
                        (dataSource as TransferGroup[]).map((group) => {
                          const groupOptions = group.children.filter(
                            (opt) => !selectedValues.includes(opt.value)
                          );
                          const filteredGroupOptions = filterFn
                            ? groupOptions.filter((opt) => filterFn(searchValue, opt))
                            : groupOptions;

                          if (filteredGroupOptions.length === 0) return null;

                          return (
                            <div key={group.title} className="mb-4">
                              <div className="text-muted-foreground mb-1 px-2 py-1 text-xs font-medium">
                                {group.title}
                              </div>
                              {filteredGroupOptions.map((option) => {
                                if (renderSourceItem) {
                                  return (
                                    <div key={option.key || option.value}>
                                      {renderSourceItem({
                                        ...option,
                                        onChange: () =>
                                          selectedValues.includes(option.value)
                                            ? handleDeselect(option)
                                            : handleSelect(option),
                                      })}
                                    </div>
                                  );
                                }
                                return (
                                  <div
                                    key={option.key || option.value}
                                    className={cn(
                                      'hover:bg-accent flex cursor-pointer items-center gap-2 rounded p-2',
                                      option.disabled && 'cursor-not-allowed opacity-50'
                                    )}
                                    onClick={() =>
                                      !option.disabled &&
                                      (selectedValues.includes(option.value)
                                        ? handleDeselect(option)
                                        : handleSelect(option))
                                    }>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-medium">{option.label}</div>
                                      {option.description && (
                                        <div className="text-muted-foreground text-xs">
                                          {option.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })
                      ) : // Render flat list
                      filteredSourceOptions.length === 0 ? (
                        <div className="text-muted-foreground py-8 text-center text-sm">
                          {emptyMessage}
                        </div>
                      ) : (
                        filteredSourceOptions.map((option) => {
                          if (renderSourceItem) {
                            return (
                              <div key={option.key || option.value}>
                                {renderSourceItem({
                                  ...option,
                                  onChange: () =>
                                    selectedValues.includes(option.value)
                                      ? handleDeselect(option)
                                      : handleSelect(option),
                                })}
                              </div>
                            );
                          }
                          return (
                            <div
                              key={option.key || option.value}
                              className={cn(
                                'hover:bg-accent flex cursor-pointer items-center gap-2 rounded p-2',
                                option.disabled && 'cursor-not-allowed opacity-50'
                              )}
                              onClick={() =>
                                !option.disabled &&
                                (selectedValues.includes(option.value)
                                  ? handleDeselect(option)
                                  : handleSelect(option))
                              }>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium">{option.label}</div>
                                {option.description && (
                                  <div className="text-muted-foreground text-xs">
                                    {option.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Selected Panel */}
                  <div className="flex flex-1 flex-col">
                    {renderSelectedHeader ? (
                      renderSelectedHeader({ count: selectedOptions.length })
                    ) : (
                      <div className="border-b p-3">
                        <div className="flex min-h-[2.25rem] items-center justify-between">
                          <span className="text-sm font-medium">
                            {selectedOptions.length} selected
                          </span>
                          {selectedOptions.length > 0 && (
                            <Button
                              htmlType="button"
                              theme="borderless"
                              size="small"
                              onClick={handleDeselectAll}
                              disabled={disabled}>
                              Clear All
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto p-2">
                      {selectedOptions.length === 0 ? (
                        <div className="text-muted-foreground py-8 text-center text-sm">
                          No items selected
                        </div>
                      ) : (
                        selectedOptions.map((option) => {
                          if (renderSelectedItem) {
                            return (
                              <div key={option.key || option.value}>
                                {renderSelectedItem({
                                  ...option,
                                  onRemove: () => handleDeselect(option),
                                })}
                              </div>
                            );
                          }
                          return (
                            <div
                              key={option.key || option.value}
                              className="hover:bg-accent group flex items-center gap-2 rounded p-2">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium">{option.label}</div>
                                {option.description && (
                                  <div className="text-muted-foreground text-xs">
                                    {option.description}
                                  </div>
                                )}
                              </div>
                              <Button
                                htmlType="button"
                                theme="borderless"
                                size="small"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => handleDeselect(option)}
                                disabled={disabled}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </FormControl>
            {!hideError && <FormMessage />}
          </FormItem>
        );
      }}
    />
  );
};
