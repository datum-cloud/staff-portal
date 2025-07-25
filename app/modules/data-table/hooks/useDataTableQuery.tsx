import { ListQueryParams } from '@/resources/schemas/common.schema';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ColumnPinningState,
  OnChangeFn,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import { parseAsArrayOf, parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { useCallback, useEffect, useMemo, useState } from 'react';

// --- Types ---
export interface FilterValue {
  [key: string]: any;
}

export interface FilterConfig {
  [filterKey: string]: {
    parser?: (value: any) => any;
    serializer?: (value: any) => any;
    defaultValue?: any;
  };
}

export interface FetchArgs extends ListQueryParams {
  sorting?: SortingState;
  search?: string;
}

export interface UseDataTableQueryOptions<T> {
  queryKeyPrefix: string | string[];
  fetchFn: (args: FetchArgs) => Promise<T>;
  initialLimit?: number;
  useSorting?: boolean;
  useFilters?: boolean;
  useSearch?: boolean;
  filterConfig?: FilterConfig;
  enabled?: boolean;
}

export interface UseDataTableQueryReturn<T> {
  query: ReturnType<typeof useQuery<T>>;
  limit: number;
  cursor?: string;
  sorting: SortingState;
  filters: FilterValue;
  search?: string;
  columnVisibility: VisibilityState;
  columnPinning: ColumnPinningState;
  columnOrder: string[];
  rowSelection: RowSelectionState;
  setLimit: (s: number) => void;
  setCursor: (token: string) => void;
  setSorting?: OnChangeFn<SortingState>;
  setFilter: (filterKey: string, value: any) => void;
  setFilters: (newFilters: Partial<FilterValue>) => void;
  clearFilter: (filterKey: string) => void;
  clearAllFilters: () => void;
  setSearch?: (value: string) => void;
  clearSearch?: () => void;
  setColumnVisibility: OnChangeFn<VisibilityState>;
  setColumnPinning: OnChangeFn<ColumnPinningState>;
  setColumnOrder: OnChangeFn<string[]>;
  setRowSelection: OnChangeFn<RowSelectionState>;
}

// --- Sorting utilities ---
const parseSortString = (val: string): SortingState[number] | null => {
  const [id, dir] = val.split(':');
  if (!id) return null;
  return { id, desc: dir === 'desc' };
};

const toSortString = (s: SortingState[number]): string => {
  return `${s.id}:${s.desc ? 'desc' : 'asc'}`;
};

const toSortingState = (values: string[] | undefined): SortingState => {
  return values?.map(parseSortString).filter(Boolean) as SortingState;
};

// --- Column pinning utilities ---
const parseColumnPinning = (pinColumns: string): ColumnPinningState => {
  const out: ColumnPinningState = {};
  pinColumns.split('|').forEach((side) => {
    const [key, value] = side.split(':');
    if (key === 'left' || key === 'right') {
      out[key] = value?.split(',').filter(Boolean) ?? [];
    }
  });
  return out;
};

const serializeColumnPinning = (pinning: ColumnPinningState): string => {
  const left = pinning.left?.join(',') ?? '';
  const right = pinning.right?.join(',') ?? '';
  return `left:${left}|right:${right}`;
};

// --- Column visibility utilities ---
const parseColumnVisibility = (visibleColumns: string[]): VisibilityState => {
  const obj: Record<string, boolean> = {};
  visibleColumns.forEach((col) => (obj[col] = true));
  return obj;
};

const serializeColumnVisibility = (visibility: VisibilityState): string[] => {
  return Object.keys(visibility).filter((k) => visibility[k]);
};

export function useDataTableQuery<T>({
  queryKeyPrefix,
  fetchFn,
  initialLimit = 20,
  useSorting = true,
  useFilters = false,
  useSearch = false,
  filterConfig = {},
  enabled = true,
}: UseDataTableQueryOptions<T>): UseDataTableQueryReturn<T> {
  // --- URL State Management ---
  const [limitRaw, setLimitRaw] = useQueryState('limit', parseAsInteger.withDefault(initialLimit));
  const [cursor, setCursor] = useQueryState('cursor', parseAsString.withDefault(''));
  const [sortRaw, setSortRaw] = useQueryState(
    'sort',
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const [filtersRaw, setFiltersRaw] = useQueryState('filters', parseAsString.withDefault(''));
  const [searchRaw, setSearchRaw] = useQueryState('search', parseAsString.withDefault(''));
  const [visibleColumns, setVisibleColumns] = useQueryState(
    'columns',
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const [pinColumns, setPinColumns] = useQueryState('pins', parseAsString.withDefault(''));
  const [orderColumns, setOrderColumns] = useQueryState(
    'order',
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // --- Memoized State Transformations ---
  const sorting = useMemo(() => toSortingState(sortRaw), [sortRaw]);

  const filters = useMemo(() => {
    const result = {} as Record<string, any>;

    if (!filtersRaw || !useFilters) return result;

    try {
      const parsed = JSON.parse(filtersRaw);

      // Handle all values from the parsed filters
      Object.entries(parsed).forEach(([filterKey, rawValue]) => {
        if (rawValue !== undefined) {
          try {
            const filterConfigItem = filterConfig[filterKey];
            result[filterKey] = filterConfigItem?.parser
              ? filterConfigItem.parser(rawValue)
              : rawValue;
          } catch (error) {
            console.warn(`Failed to parse filter value for ${filterKey}:`, error);
          }
        }
      });

      // Apply default values from filter config
      Object.entries(filterConfig).forEach(([filterKey, filterConfigItem]) => {
        if (result[filterKey] === undefined && filterConfigItem.defaultValue !== undefined) {
          result[filterKey] = filterConfigItem.defaultValue;
        }
      });
    } catch (error) {
      console.warn('Failed to parse filter values:', error);
    }

    return result;
  }, [filtersRaw, useFilters, filterConfig]);

  const columnVisibility = useMemo(() => parseColumnVisibility(visibleColumns), [visibleColumns]);

  const columnPinning = useMemo(() => parseColumnPinning(pinColumns), [pinColumns]);

  const columnOrder = useMemo(() => [...orderColumns], [orderColumns]);

  // --- Search State ---
  const search = useMemo(() => {
    if (!useSearch || !searchRaw) return undefined;
    return searchRaw.trim() || undefined;
  }, [useSearch, searchRaw]);

  // --- Query Key Construction ---
  const queryKey = useMemo(() => {
    const key = Array.isArray(queryKeyPrefix)
      ? [...queryKeyPrefix, limitRaw]
      : [queryKeyPrefix, limitRaw];
    if (cursor) key.push(cursor);
    if (useSorting) key.push(sorting.map(toSortString).join(','));
    if (useFilters && filtersRaw) key.push(filtersRaw);
    if (useSearch && searchRaw) key.push(searchRaw);
    return key;
  }, [
    queryKeyPrefix,
    limitRaw,
    cursor,
    useSorting,
    sorting,
    useFilters,
    filtersRaw,
    useSearch,
    searchRaw,
  ]);

  // --- Query Execution ---
  const query = useQuery({
    queryKey,
    queryFn: () =>
      fetchFn({
        limit: limitRaw,
        cursor: cursor || undefined,
        sorting: useSorting ? sorting : undefined,
        filters: useFilters ? filters : undefined,
        search: useSearch ? search : undefined,
      }),
    placeholderData: keepPreviousData,
    enabled,
  });

  // --- Memoized Setters ---
  const setSorting = useMemo(() => {
    if (!useSorting) return undefined;

    return ((updater: SortingState | ((old: SortingState) => SortingState)) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      setSortRaw(next.map(toSortString));
      setCursor(''); // Reset cursor when sorting changes
    }) as OnChangeFn<SortingState>;
  }, [useSorting, sorting, setSortRaw, setCursor]);

  const setFilter = useCallback(
    (filterKey: string, value: any) => {
      if (!useFilters) return;

      const currentFilters = filtersRaw ? JSON.parse(filtersRaw) : {};
      const filterConfigItem = filterConfig[filterKey];

      const serializedValue = filterConfigItem?.serializer
        ? filterConfigItem.serializer(value)
        : value;

      const newFilters = {
        ...currentFilters,
        [filterKey]: serializedValue,
      };

      setFiltersRaw(JSON.stringify(newFilters));
      setCursor(''); // Reset cursor when filters change
    },
    [filtersRaw, useFilters, filterConfig, setFiltersRaw, setCursor]
  );

  const setFilters = useCallback(
    (newFilters: Partial<FilterValue>) => {
      if (!useFilters) return;

      const currentFilters = filtersRaw ? JSON.parse(filtersRaw) : {};
      const updatedFilters = { ...currentFilters };

      Object.entries(newFilters).forEach(([filterKey, value]) => {
        const filterConfigItem = filterConfig[filterKey];
        const serializedValue = filterConfigItem?.serializer
          ? filterConfigItem.serializer(value)
          : value;
        updatedFilters[filterKey] = serializedValue;
      });

      setFiltersRaw(JSON.stringify(updatedFilters));
      setCursor(''); // Reset cursor when filters change
    },
    [filtersRaw, useFilters, filterConfig, setFiltersRaw, setCursor]
  );

  const clearFilter = useCallback(
    (filterKey: string) => {
      if (!useFilters) return;

      const currentFilters = filtersRaw ? JSON.parse(filtersRaw) : {};
      const { [filterKey]: removed, ...remainingFilters } = currentFilters;
      setFiltersRaw(
        Object.keys(remainingFilters).length > 0 ? JSON.stringify(remainingFilters) : ''
      );
      setCursor(''); // Reset cursor when filters change
    },
    [filtersRaw, useFilters, setFiltersRaw, setCursor]
  );

  const clearAllFilters = useCallback(() => {
    if (!useFilters) return;

    setFiltersRaw('');
    setCursor(''); // Reset cursor when filters change
  }, [useFilters, setFiltersRaw, setCursor]);

  const setSearch = useCallback(
    (value: string) => {
      if (!useSearch) return;

      setSearchRaw(value);
      setCursor(''); // Reset cursor when search changes
    },
    [useSearch, setSearchRaw, setCursor]
  );

  const clearSearch = useCallback(() => {
    if (!useSearch) return;

    setSearchRaw('');
    setCursor(''); // Reset cursor when search changes
  }, [useSearch, setSearchRaw, setCursor]);

  const setLimit = useCallback(
    (s: number) => {
      setLimitRaw(s);
      setCursor(''); // Reset cursor when limit changes
    },
    [setLimitRaw, setCursor]
  );

  const setColumnVisibility = useCallback<OnChangeFn<VisibilityState>>(
    (updater) => {
      const next = typeof updater === 'function' ? updater(columnVisibility) : updater;
      const keys = serializeColumnVisibility(next);
      void setVisibleColumns(keys);
    },
    [columnVisibility, setVisibleColumns]
  );

  const setColumnPinning = useCallback<OnChangeFn<ColumnPinningState>>(
    (updater) => {
      const next = typeof updater === 'function' ? updater(columnPinning) : updater;
      const str = serializeColumnPinning(next);
      void setPinColumns(str);
    },
    [columnPinning, setPinColumns]
  );

  const setColumnOrder = useCallback<OnChangeFn<string[]>>(
    (updater) => {
      const next = typeof updater === 'function' ? updater(columnOrder) : updater;
      void setOrderColumns(next);
    },
    [columnOrder, setOrderColumns]
  );

  // --- Row Selection with Callbacks ---
  const setSafeRowSelection = useCallback<OnChangeFn<RowSelectionState>>(
    (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(next);
    },
    [rowSelection]
  );

  return {
    query,
    limit: limitRaw,
    cursor,
    sorting,
    filters,
    search,
    columnVisibility,
    columnPinning,
    columnOrder,
    rowSelection,
    setLimit,
    setCursor,
    setSorting,
    setFilter,
    setFilters,
    clearFilter,
    clearAllFilters,
    setSearch,
    clearSearch,
    setColumnVisibility,
    setColumnPinning,
    setColumnOrder,
    setRowSelection: setSafeRowSelection,
  };
}

// Predefined filter configurations for common use cases
export const filterConfigs = {
  // Date range filter - store nanosecond timestamps directly (no conversion needed)
  dateRange: {},

  // Number range filter
  numberRange: {
    min: {
      parser: (value: any) => Number(value),
      serializer: (value: number) => value,
    },
    max: {
      parser: (value: any) => Number(value),
      serializer: (value: number) => value,
    },
  },

  // Multi-select filter
  multiSelect: {
    values: {
      parser: (value: any) => (Array.isArray(value) ? value : [value]),
      serializer: (value: string[]) => value,
      defaultValue: [],
    },
  },

  // Single select filter
  select: {
    value: {
      parser: (value: any) => value,
      serializer: (value: string) => value,
    },
  },

  // Boolean filter
  boolean: {
    value: {
      parser: (value: any) => Boolean(value),
      serializer: (value: boolean) => value,
    },
  },
} as const;
