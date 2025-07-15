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
  limit: number;
  cursor?: string;
  sorting?: SortingState;
  globalFilter?: string;
}

export interface UseDataTableQueryOptions<T> {
  queryKeyPrefix: string;
  fetchFn: (args: FetchArgs) => Promise<T>;
  initialLimit?: number;
  useSorting?: boolean;
  useGlobalFilter?: boolean;
  enabled?: boolean;
}

export interface UseDataTableQueryReturn<T> {
  query: ReturnType<typeof useQuery<T>>;
  limit: number;
  cursor?: string;
  sorting: SortingState;
  globalFilter: string;
  columnVisibility: VisibilityState;
  columnPinning: ColumnPinningState;
  columnOrder: string[];
  setLimit: (s: number) => void;
  setCursor: (token: string) => void;
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
  initialLimit = 20,
  useSorting = true,
  useGlobalFilter = true,
  enabled = true,
}: UseDataTableQueryOptions<T>): UseDataTableQueryReturn<T> {
  // --- URL State Management ---
  const [limitRaw, setLimitRaw] = useQueryState('limit', parseAsInteger.withDefault(initialLimit));
  const [cursor, setCursor] = useQueryState('cursor', parseAsString.withDefault(''));
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

  // --- Query Key Construction ---
  const queryKey = useMemo(() => {
    const key = [queryKeyPrefix, limitRaw];
    if (cursor) key.push(cursor);
    if (useSorting) key.push(sorting.map(toSortString).join(','));
    if (useGlobalFilter) key.push(globalFilter);
    return key;
  }, [queryKeyPrefix, limitRaw, cursor, useSorting, sorting, useGlobalFilter, globalFilter]);

  // --- Query Execution ---
  const query = useQuery({
    queryKey,
    queryFn: () =>
      fetchFn({
        limit: limitRaw,
        cursor: cursor || undefined,
        sorting: useSorting ? sorting : undefined,
        globalFilter: useGlobalFilter ? globalFilter : undefined,
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

  const setGlobalFilter = useMemo(() => {
    if (!useGlobalFilter) return undefined;

    return ((value: string | ((old: string) => string)) => {
      const next = typeof value === 'function' ? value(globalFilter) : value;
      setGlobalFilterRaw(next);
      setCursor(''); // Reset cursor when filter changes
    }) as OnChangeFn<string>;
  }, [useGlobalFilter, globalFilter, setGlobalFilterRaw, setCursor]);

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

  return {
    query,
    limit: limitRaw,
    cursor,
    sorting,
    globalFilter,
    columnVisibility,
    columnPinning,
    columnOrder,
    setLimit,
    setCursor,
    setSorting,
    setGlobalFilter,
    setColumnVisibility,
    setColumnPinning,
    setColumnOrder,
  };
}
