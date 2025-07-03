import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  SortingState,
  OnChangeFn,
  VisibilityState,
  ColumnPinningState,
} from '@tanstack/react-table';
import hash from 'object-hash';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

// Define the context type - TQuery is optional since it's mainly for transform function
export type DataTableContextType<TData, TQuery = any> = {
  table: ReturnType<typeof useReactTable<TData>>;
  query: UseQueryResult<TQuery>;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

// Keep a default context for backward compatibility
export const DataTableContext = createContext<DataTableContextType<any, any> | null>(null);

// Type-safe hook that infers types from the provider
export function useDataTableInstance<TData = any, TQuery = any>(): DataTableContextType<
  TData,
  TQuery
> {
  const ctx = useContext(DataTableContext);
  if (!ctx) {
    throw new Error('useDataTableInstance must be used inside DataTableProvider');
  }
  return ctx as DataTableContextType<TData, TQuery>;
}

interface DataTableQuery<TData> {
  rows: TData[];
  cursor?: string;
}

interface DataTableProviderProps<TData, TQuery = DataTableQuery<TData>> {
  columns: ColumnDef<TData, any>[];
  query: UseQueryResult<TQuery>;
  transform?: (raw: TQuery) => DataTableQuery<TData>;

  limit: number;
  cursor?: string;
  sorting?: SortingState;
  globalFilter?: string;
  columnVisibility?: VisibilityState;
  columnPinning?: ColumnPinningState;
  columnOrder?: string[];

  setLimit: (s: number) => void;
  setCursor: (token: string) => void;
  setSorting?: OnChangeFn<SortingState>;
  setGlobalFilter?: OnChangeFn<string>;
  setColumnVisibility?: OnChangeFn<VisibilityState>;
  setColumnPinning?: OnChangeFn<ColumnPinningState>;
  setColumnOrder?: OnChangeFn<string[]>;

  children: React.ReactNode;
}

export function DataTableProvider<TData, TQuery = DataTableQuery<TData>>({
  columns,
  query,
  transform,
  children,
  limit,
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
}: DataTableProviderProps<TData, TQuery>) {
  // Cursor-based pagination state
  const [cursorHistory, setCursorHistory] = useState<string[]>(['']); // [''] = first page
  const [currentPage, setCurrentPage] = useState(0); // 0 = first page

  const { rows, cursor: nextCursor } = useMemo<DataTableQuery<TData>>(() => {
    if (!query.data) return { rows: [], cursor: undefined };
    const data = transform ? transform(query.data) : (query.data as any);
    return {
      rows: data.rows || [],
      cursor: data.cursor,
    };
  }, [query.data, transform]);

  // Pagination state
  const hasNextPage = !!nextCursor;
  const hasPrevPage = currentPage > 0;

  // Track previous filter hash to detect actual changes
  const prevFilterHashRef = useRef<string>('');

  // Reset pagination when filters change (but not when cursor changes)
  useEffect(() => {
    const currentFilterHash = hash({ sorting, globalFilter, limit });

    if (currentFilterHash !== prevFilterHashRef.current) {
      setCursorHistory(['']);
      setCurrentPage(0);
      prevFilterHashRef.current = currentFilterHash;
    }
  }, [sorting, globalFilter, limit]);

  const safeColumnVisibility = useMemo<VisibilityState>(() => {
    return columnVisibility && typeof columnVisibility === 'object' && !('_def' in columnVisibility)
      ? columnVisibility
      : {};
  }, [columnVisibility]);

  const safeColumnPinning = useMemo<ColumnPinningState>(() => {
    return columnPinning && typeof columnPinning === 'object' && !('_def' in columnPinning)
      ? columnPinning
      : {};
  }, [columnPinning]);

  const table = useReactTable<TData>({
    data: rows,
    columns,
    rowCount: rows.length,
    state: {
      pagination: { pageIndex: currentPage, pageSize: limit },
      sorting: sorting ?? [],
      globalFilter: globalFilter ?? '',
      columnVisibility: safeColumnVisibility,
      columnPinning: safeColumnPinning,
      columnOrder: columnOrder ?? [],
    },
    manualPagination: true,
    manualSorting: !!setSorting,
    manualFiltering: !!setGlobalFilter,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onColumnOrderChange: setColumnOrder,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: currentPage, pageSize: limit })
          : updater;

      setLimit(next.pageSize ?? limit);

      if (next.pageIndex > currentPage) {
        // Going to next page
        if (nextCursor) {
          // Store current cursor in history and move forward
          const newHistory = [...cursorHistory];

          // Store the current cursor at the current position
          newHistory[currentPage] = cursor || '';

          setCursorHistory(newHistory);
          setCurrentPage(currentPage + 1);
          setCursor(nextCursor);
        }
      } else if (next.pageIndex < currentPage) {
        // Going to previous page
        if (currentPage > 0) {
          // Get the previous cursor from history
          const prevCursor = cursorHistory[currentPage - 1];
          const newPage = currentPage - 1;

          setCursor(prevCursor || '');
          setCurrentPage(newPage);
        }
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const value = useMemo<DataTableContextType<TData, TQuery>>(
    () => ({
      table,
      query,
      hasNextPage,
      hasPrevPage,
    }),
    [table, query, hasNextPage, hasPrevPage]
  );

  return <DataTableContext.Provider value={value}>{children}</DataTableContext.Provider>;
}
