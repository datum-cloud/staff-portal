import type { FilterConfig, FilterValue } from '../hooks/useDataTableQuery';
import { Badge } from '@/modules/shadcn/ui/badge';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { format } from 'date-fns';
import { Trash2, X } from 'lucide-react';
import { useMemo } from 'react';

interface FilterItemBadgeProps {
  label: string;
  onRemove: () => void;
  ariaLabel?: string;
}

function FilterItemBadge({ label, onRemove, ariaLabel }: FilterItemBadgeProps) {
  return (
    <Badge variant="outline" className="bg-muted flex items-center gap-1.5 px-2 py-0.5 text-xs">
      <span>{label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label={ariaLabel || `Remove ${label}`}>
        <X size={10} />
      </button>
    </Badge>
  );
}

export interface ActiveFilterItem {
  key: string;
  label: string;
  value: string | React.ReactNode;
  onRemove: () => void;
  // For multi-value filters, show individual items
  items?: Array<{
    value: string;
    label: string;
    onRemove: () => void;
  }>;
}

export interface DataTableActiveFiltersProps {
  filters: FilterValue;
  filterConfig?: FilterConfig;
  search?: string;
  onClearFilter: (key: string) => void;
  onClearAllFilters: () => void;
  onClearSearch?: () => void;
  // Custom formatters for specific filter keys
  formatFilterValue?: (key: string, value: any) => string | React.ReactNode;
  // Custom labels for filter keys
  filterLabels?: Record<string, string>;
  // Group filters together (e.g., { 'timeRange': ['start', 'end'] })
  filterGroups?: Record<string, string[]>;
  // Custom formatter for grouped filters
  formatGroupedFilter?: (groupKey: string, values: Record<string, any>) => string | React.ReactNode;
  // Filters that should show individual items (e.g., ['actions'] for comma-separated values)
  multiValueFilters?: string[];
  // Callback to remove individual item from a multi-value filter
  onClearFilterItem?: (filterKey: string, itemValue: string) => void;
  // Formatter for individual items in multi-value filters
  formatFilterItem?: (filterKey: string, itemValue: string) => string;
  // Filter keys or group keys to exclude from display (e.g., ['search', 'timeRange'])
  excludeFilters?: string[];
  className?: string;
}

export function DataTableActiveFilters({
  filters,
  filterConfig = {},
  search,
  onClearFilter,
  onClearAllFilters,
  onClearSearch,
  formatFilterValue,
  filterLabels = {},
  filterGroups = {},
  formatGroupedFilter,
  multiValueFilters = [],
  onClearFilterItem,
  formatFilterItem,
  excludeFilters = [],
  className,
}: DataTableActiveFiltersProps) {
  const activeFilters = useMemo(() => {
    const items: ActiveFilterItem[] = [];
    const processedKeys = new Set<string>();

    // Add search if present and not excluded
    if (search && !excludeFilters.includes('search')) {
      items.push({
        key: 'search',
        label: filterLabels.search || t`Search`,
        value: `"${search}"`,
        onRemove: () => onClearSearch?.(),
      });
    }

    // Process grouped filters first
    Object.entries(filterGroups).forEach(([groupKey, keys]) => {
      // Skip excluded filter groups, but mark their keys as processed
      if (excludeFilters.includes(groupKey)) {
        keys.forEach((key) => processedKeys.add(key));
        return;
      }
      const groupValues: Record<string, any> = {};
      let hasValues = false;

      keys.forEach((key) => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          groupValues[key] = value;
          hasValues = true;
          processedKeys.add(key);
        }
      });

      if (hasValues) {
        // Check if all values are defaults (skip if so)
        const allDefaults = keys.every((key) => {
          const configItem = filterConfig[key];
          return (
            configItem?.defaultValue !== undefined && groupValues[key] === configItem.defaultValue
          );
        });

        if (!allDefaults) {
          let displayValue: string | React.ReactNode;

          if (formatGroupedFilter) {
            displayValue = formatGroupedFilter(groupKey, groupValues);
            if (displayValue === null || displayValue === undefined) return;
          } else {
            // Default: show all values
            displayValue = Object.entries(groupValues)
              .map(([k, v]) => {
                if (formatFilterValue) {
                  const formatted = formatFilterValue(k, v);
                  return formatted !== null && formatted !== undefined ? formatted : String(v);
                }
                return String(v);
              })
              .join(' - ');
          }

          items.push({
            key: groupKey,
            label: filterLabels[groupKey] || groupKey,
            value: displayValue,
            onRemove: () => {
              keys.forEach((key) => onClearFilter(key));
            },
          });
        }
      }
    });

    // Process remaining individual filters
    Object.entries(filters).forEach(([key, value]) => {
      // Skip if already processed as part of a group
      if (processedKeys.has(key)) return;
      // Skip if excluded
      if (excludeFilters.includes(key)) return;
      if (value === undefined || value === null || value === '') return;

      // Skip if it's a default value (we don't want to show defaults as "active")
      const configItem = filterConfig[key];
      if (configItem?.defaultValue !== undefined && value === configItem.defaultValue) {
        return;
      }

      let displayValue: string | React.ReactNode;

      // Use custom formatter if provided
      if (formatFilterValue) {
        displayValue = formatFilterValue(key, value);
        if (displayValue === null || displayValue === undefined) return;
      } else {
        // Default formatting
        if (Array.isArray(value)) {
          displayValue = value.join(', ');
        } else if (typeof value === 'object') {
          displayValue = JSON.stringify(value);
        } else {
          displayValue = String(value);
        }
      }

      // Check if this is a multi-value filter that should show individual items
      const isMultiValue = multiValueFilters.includes(key);
      let filterItems: ActiveFilterItem['items'] | undefined;

      if (isMultiValue && onClearFilterItem && typeof value === 'string') {
        // Parse comma-separated values
        const itemValues = value.split(',').filter(Boolean);
        filterItems = itemValues.map((itemValue) => ({
          value: itemValue.trim(),
          label: formatFilterItem ? formatFilterItem(key, itemValue.trim()) : itemValue.trim(),
          onRemove: () => onClearFilterItem(key, itemValue.trim()),
        }));
      }

      items.push({
        key,
        label: filterLabels[key] || key,
        value: displayValue,
        onRemove: () => onClearFilter(key),
        items: filterItems,
      });
    });

    return items;
  }, [
    filters,
    filterConfig,
    search,
    formatFilterValue,
    filterLabels,
    filterGroups,
    formatGroupedFilter,
    multiValueFilters,
    onClearFilterItem,
    formatFilterItem,
    excludeFilters,
    onClearFilter,
    onClearSearch,
  ]);

  if (activeFilters.length === 0) {
    return null;
  }

  const filterGroupCount = activeFilters.length;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ''}`}>
      <span className="text-muted-foreground text-sm">
        <Trans>Selected Filters</Trans>
      </span>
      {activeFilters.map((filter) => (
        <div key={filter.key} className="flex items-center gap-2 rounded-md border px-2 py-1">
          {/* Filter category name as bold text */}
          <span className="text-muted-foreground border-r pr-2 text-xs">{filter.label}</span>
          {/* Individual items within the filter */}
          {filter.items && filter.items.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                {filter.items.map((item, index) => (
                  <FilterItemBadge
                    key={`${filter.key}-${item.value}-${index}`}
                    label={item.label}
                    onRemove={item.onRemove}
                    ariaLabel={`Remove ${item.label} from ${filter.label}`}
                  />
                ))}
              </div>
              {/* X icon to clear entire filter category - only show if more than 1 item */}
              {filter.items.length > 1 && (
                <Tooltip message={`Clear ${filter.label} filter`}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      filter.onRemove();
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`Remove ${filter.label} filter`}>
                    <X size={16} />
                  </button>
                </Tooltip>
              )}
            </>
          ) : (
            // For non-multi-value filters, show as a single badge
            <FilterItemBadge
              label={String(filter.value)}
              onRemove={filter.onRemove}
              ariaLabel={`Remove ${filter.label} filter`}
            />
          )}
        </div>
      ))}
      {/* Trash icon to clear all filters - only show if more than 2 filter groups */}
      {filterGroupCount > 1 && (
        <Tooltip message="Clear all filters">
          <button
            type="button"
            onClick={onClearAllFilters}
            className="text-destructive hover:text-destructive/80 transition-colors"
            aria-label="Clear all filters">
            <Trash2 size={16} />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
