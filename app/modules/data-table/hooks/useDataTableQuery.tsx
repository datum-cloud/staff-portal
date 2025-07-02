import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ColumnPinningState,
  OnChangeFn,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import { parseAsArrayOf, parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { useCallback, useMemo } from 'react';

// --- Types ---
export interface FetchArgs {
  pageIndex: number;
  pageSize: number;
  sorting?: SortingState;
  globalFilter?: string;
}

export interface FetchResult<T> {
  rows: T[];
  pageCount: number;
}

export interface UseDataTableQueryOptions<T> {
  queryKeyPrefix: string;
  fetchFn: (args: FetchArgs) => Promise<T>;
  initialPageSize?: number;
  useSorting?: boolean;
  useGlobalFilter?: boolean;
  enabled?: boolean;
}

export interface UseDataTableQueryReturn<T> {
  query: ReturnType<typeof useQuery<T>>;
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  globalFilter: string;
  columnVisibility: VisibilityState;
  columnPinning: ColumnPinningState;
  columnOrder: string[];
  setPageIndex: (i: number) => void;
  setPageSize: (s: number) => void;
  setSorting?: OnChangeFn<SortingState>;
  setGlobalFilter?: OnChangeFn<string>;
  setColumnVisibility: OnChangeFn<VisibilityState>;
  setColumnPinning: OnChangeFn<ColumnPinningState>;
  setColumnOrder: OnChangeFn<string[]>;
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
  initialPageSize = 10,
  useSorting = true,
  useGlobalFilter = true,
  enabled = true,
}: UseDataTableQueryOptions<T>): UseDataTableQueryReturn<T> {
  // --- URL State Management ---
  const [pageIndex, setPageIndexRaw] = useQueryState('page', parseAsInteger.withDefault(0));
  const [pageSize, setPageSize] = useQueryState(
    'size',
    parseAsInteger.withDefault(initialPageSize)
  );
  const [sortRaw, setSortRaw] = useQueryState(
    'sort',
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const [globalFilter, setGlobalFilterRaw] = useQueryState('search', parseAsString.withDefault(''));
  const [visibleColumns, setVisibleColumns] = useQueryState(
    'columns',
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const [pinColumns, setPinColumns] = useQueryState('pins', parseAsString.withDefault(''));
  const [orderColumns, setOrderColumns] = useQueryState(
    'order',
    parseAsArrayOf(parseAsString).withDefault([])
  );

  // --- Memoized State Transformations ---
  const sorting = useMemo(() => toSortingState(sortRaw), [sortRaw]);

  const columnVisibility = useMemo(() => parseColumnVisibility(visibleColumns), [visibleColumns]);

  const columnPinning = useMemo(() => parseColumnPinning(pinColumns), [pinColumns]);

  const columnOrder = useMemo(() => [...orderColumns], [orderColumns]);

  // --- Memoized Setters ---
  const setSorting = useMemo(() => {
    if (!useSorting) return undefined;

    return ((updater: SortingState | ((old: SortingState) => SortingState)) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      setSortRaw(next.map(toSortString));
      setPageIndexRaw(0);
    }) as OnChangeFn<SortingState>;
  }, [useSorting, sorting, setSortRaw, setPageIndexRaw]);

  const setGlobalFilter = useMemo(() => {
    if (!useGlobalFilter) return undefined;

    return ((value: string | ((old: string) => string)) => {
      const next = typeof value === 'function' ? value(globalFilter) : value;
      setGlobalFilterRaw(next);
      setPageIndexRaw(0);
    }) as OnChangeFn<string>;
  }, [useGlobalFilter, globalFilter, setGlobalFilterRaw, setPageIndexRaw]);

  const setPageIndex = useCallback((i: number) => setPageIndexRaw(i), [setPageIndexRaw]);

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

  // --- Query Key Construction ---
  const queryKey = useMemo(() => {
    const key = [queryKeyPrefix, pageIndex, pageSize];
    if (useSorting) key.push(sorting.map(toSortString).join(','));
    if (useGlobalFilter) key.push(globalFilter);
    return key;
  }, [queryKeyPrefix, pageIndex, pageSize, useSorting, sorting, useGlobalFilter, globalFilter]);

  // --- Query Execution ---
  const query = useQuery({
    queryKey,
    queryFn: () =>
      fetchFn({
        pageIndex,
        pageSize,
        sorting: useSorting ? sorting : undefined,
        globalFilter: useGlobalFilter ? globalFilter : undefined,
      }),
    placeholderData: keepPreviousData,
    enabled,
  });

  return {
    query,
    pageIndex,
    pageSize,
    sorting,
    globalFilter,
    columnVisibility,
    columnPinning,
    columnOrder,
    setPageIndex,
    setPageSize,
    setSorting,
    setGlobalFilter,
    setColumnVisibility,
    setColumnPinning,
    setColumnOrder,
  };
}
