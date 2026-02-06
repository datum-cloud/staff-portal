import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ColumnPinningState,
  OnChangeFn,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import { parseAsArrayOf, parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { useCallback, useMemo, useState } from 'react';

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

export interface FetchArgs {
  // No limit/cursor needed for client-side - fetch all data
}

export interface UseClientDataTableQueryOptions<TQuery> {
  queryKeyPrefix: string | string[];
  fetchFn: (args?: FetchArgs) => Promise<TQuery>;
  initialPageSize?: number;
  /** Default sort when no sort param in URL. Each item: "columnId:asc" or "columnId:desc" */
  defaultSort?: string[];
  useSorting?: boolean;
  useFilters?: boolean;
  useSearch?: boolean;
  filterConfig?: FilterConfig;
  enabled?: boolean;
  // Optional namespace to prefix URL parameters for multiple tables on the same page
  namespace?: string;
}

export interface UseClientDataTableQueryReturn<TQuery> {
  query: ReturnType<typeof useQuery<TQuery>>;
  pageSize: number;
  pageIndex: number;
  sorting: SortingState;
  filters: FilterValue;
  search?: string;
  columnVisibility: VisibilityState;
  columnPinning: ColumnPinningState;
  columnOrder: string[];
  rowSelection: RowSelectionState;
  useSorting: boolean;
  useSearch: boolean;
  useFilters: boolean;
  setPageSize: (size: number) => void;
  setPageIndex: (index: number) => void;
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

export function useClientDataTableQuery<TQuery>({
  queryKeyPrefix,
  fetchFn,
  initialPageSize = 20,
  defaultSort,
  useSorting = true,
  useFilters = false,
  useSearch = false,
  filterConfig = {},
  enabled = true,
  namespace,
}: UseClientDataTableQueryOptions<TQuery>): UseClientDataTableQueryReturn<TQuery> {
  // Helper to prefix parameter names when namespace is provided
  const getParamName = (name: string) => (namespace ? `${namespace}_${name}` : name);

  // --- URL State Management ---
  const [pageSizeRaw, setPageSizeRaw] = useQueryState(
    getParamName('pageSize'),
    parseAsInteger.withDefault(initialPageSize)
  );
  // Store 1-indexed page in URL (page=1, page=2, etc.) to match what users see
  const [pageIndexRaw, setPageIndexRaw] = useQueryState(
    getParamName('pageIndex'),
    parseAsInteger.withDefault(1)
  );
  const [sortRaw, setSortRaw] = useQueryState(
    getParamName('sort'),
    parseAsArrayOf(parseAsString).withDefault(defaultSort ?? [])
  );
  const [filtersRaw, setFiltersRaw] = useQueryState(
    getParamName('filters'),
    parseAsString.withDefault('')
  );
  const [searchRaw, setSearchRaw] = useQueryState(
    getParamName('search'),
    parseAsString.withDefault('')
  );
  const [visibleColumns, setVisibleColumns] = useQueryState(
    getParamName('columns'),
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const [pinColumns, setPinColumns] = useQueryState(
    getParamName('pins'),
    parseAsString.withDefault('')
  );
  const [orderColumns, setOrderColumns] = useQueryState(
    getParamName('order'),
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // --- Memoized State Transformations ---
  const sorting = useMemo(() => toSortingState(sortRaw), [sortRaw]);

  const filters = useMemo(() => {
    const result = {} as Record<string, any>;

    if (!useFilters) return result;

    // Parse filters from URL if they exist
    if (filtersRaw) {
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
      } catch (error) {
        console.warn('Failed to parse filter values:', error);
      }
    }

    // Apply default values from filter config (even when filtersRaw is empty)
    Object.entries(filterConfig).forEach(([filterKey, filterConfigItem]) => {
      if (result[filterKey] === undefined && filterConfigItem.defaultValue !== undefined) {
        result[filterKey] = filterConfigItem.defaultValue;
      }
    });

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
    const key = Array.isArray(queryKeyPrefix) ? [...queryKeyPrefix] : [queryKeyPrefix];
    // For client-side, we fetch all data, so query key is simpler
    return key;
  }, [queryKeyPrefix]);

  // --- Query Execution ---
  const query = useQuery({
    queryKey,
    queryFn: () => fetchFn(), // No limit/cursor - K8s returns all data
    placeholderData: keepPreviousData,
    enabled,
  });

  // --- Memoized Setters ---
  const setSorting = useMemo(() => {
    if (!useSorting) return undefined;

    return ((updater: SortingState | ((old: SortingState) => SortingState)) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      setSortRaw(next.map(toSortString));
    }) as OnChangeFn<SortingState>;
  }, [useSorting, sorting, setSortRaw]);

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
    },
    [filtersRaw, useFilters, filterConfig, setFiltersRaw]
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
    },
    [filtersRaw, useFilters, filterConfig, setFiltersRaw]
  );

  const clearFilter = useCallback(
    (filterKey: string) => {
      if (!useFilters) return;

      const currentFilters = filtersRaw ? JSON.parse(filtersRaw) : {};
      const { [filterKey]: removed, ...remainingFilters } = currentFilters;
      setFiltersRaw(
        Object.keys(remainingFilters).length > 0 ? JSON.stringify(remainingFilters) : ''
      );
    },
    [filtersRaw, useFilters, setFiltersRaw]
  );

  const clearAllFilters = useCallback(() => {
    if (!useFilters) return;

    setFiltersRaw('');
  }, [useFilters, setFiltersRaw]);

  const setSearch = useCallback(
    (value: string) => {
      if (!useSearch) return;

      setSearchRaw(value);
    },
    [useSearch, setSearchRaw]
  );

  const clearSearch = useCallback(() => {
    if (!useSearch) return;

    setSearchRaw('');
  }, [useSearch, setSearchRaw]);

  const setPageSize = useCallback(
    (s: number) => {
      setPageSizeRaw(s);
    },
    [setPageSizeRaw]
  );

  const setPageIndex = useCallback(
    (index: number) => {
      setPageIndexRaw(index + 1);
    },
    [setPageIndexRaw]
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
    pageSize: pageSizeRaw,
    pageIndex: pageIndexRaw - 1,
    sorting,
    filters,
    search,
    columnVisibility,
    columnPinning,
    columnOrder,
    rowSelection,
    useSorting,
    useSearch,
    useFilters,
    setPageSize,
    setPageIndex,
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
