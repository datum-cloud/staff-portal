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
import { createContext, useContext, useMemo, useState } from 'react';

export const DataTableContext = createContext<{
  table: ReturnType<typeof useReactTable<any>>;
  query: UseQueryResult<any>;
} | null>(null);

export function useDataTableInstance() {
  const ctx = useContext(DataTableContext);
  if (!ctx) {
    throw new Error('useDataTableInstance must be used inside DataTableProvider');
  }
  return ctx;
}

interface DataTableProviderProps<T, Q = { rows: T[]; pageCount: number }> {
  columns: ColumnDef<T, any>[];
  query: UseQueryResult<Q>;
  transform?: (raw: Q) => { rows: T[]; pageCount: number };

  pageIndex: number;
  pageSize: number;
  sorting?: SortingState;
  globalFilter?: string;
  columnVisibility?: VisibilityState;
  columnPinning?: ColumnPinningState;
  columnOrder?: string[];

  setPageIndex: (i: number) => void;
  setPageSize: (s: number) => void;
  setSorting?: OnChangeFn<SortingState>;
  setGlobalFilter?: OnChangeFn<string>;
  setColumnVisibility?: OnChangeFn<VisibilityState>;
  setColumnPinning?: OnChangeFn<ColumnPinningState>;
  setColumnOrder?: OnChangeFn<string[]>;

  children: React.ReactNode;
}

export function DataTableProvider<T, Q = { rows: T[]; pageCount: number }>({
  columns,
  query,
  transform,
  children,
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
}: DataTableProviderProps<T, Q>) {
  const { rows, pageCount } = useMemo(() => {
    if (!query.data) return { rows: [], pageCount: 0 };
    return transform ? transform(query.data) : (query.data as any);
  }, [query.data, transform]);

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

  const table = useReactTable({
    data: rows,
    columns,
    pageCount,
    state: {
      pagination: { pageIndex, pageSize },
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
      const next = typeof updater === 'function' ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(next.pageIndex ?? pageIndex);
      setPageSize(next.pageSize ?? pageSize);
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const value = useMemo(() => ({ table, query }), [table, query]);

  return <DataTableContext.Provider value={value}>{children}</DataTableContext.Provider>;
}
