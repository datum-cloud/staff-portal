import {
  enhanceFirstColumnWithSelectActions,
  type ActionItem,
} from '../components/data-table-select-actions';
import { UseQueryResult } from '@tanstack/react-query';
import {
  ColumnDef,
  ColumnPinningState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  OnChangeFn,
  RowSelectionState,
  SortingState,
  useReactTable,
  VisibilityState,
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
  selectable?: boolean;
  actions?: ActionItem<TData>[];
  getRowId?: (row: TData, index: number, parent?: any) => string;

  limit: number;
  cursor?: string;
  sorting?: SortingState;
  filters?: Record<string, any>;
  columnVisibility?: VisibilityState;
  columnPinning?: ColumnPinningState;
  columnOrder?: string[];
  rowSelection?: RowSelectionState;

  setLimit: (s: number) => void;
  setCursor: (token: string) => void;
  setSorting?: OnChangeFn<SortingState>;
  setFilter?: (filterKey: string, value: any) => void;
  setFilters?: (newFilters: Partial<Record<string, any>>) => void;
  clearFilter?: (filterKey: string) => void;
  clearAllFilters?: () => void;
  setColumnVisibility?: OnChangeFn<VisibilityState>;
  setColumnPinning?: OnChangeFn<ColumnPinningState>;
  setColumnOrder?: OnChangeFn<string[]>;
  setRowSelection?: OnChangeFn<RowSelectionState>;

  children: React.ReactNode | ((context: DataTableContextType<TData, TQuery>) => React.ReactNode);
}

export function DataTableProvider<TData, TQuery = DataTableQuery<TData>>({
  columns,
  query,
  transform,
  selectable = false,
  actions,
  getRowId,
  children,
  limit,
  cursor,
  sorting,
  filters,
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
  setColumnVisibility,
  setColumnPinning,
  setColumnOrder,
  setRowSelection,
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
    const currentFilterHash = hash({ sorting, filters, limit });

    if (currentFilterHash !== prevFilterHashRef.current) {
      setCursorHistory(['']);
      setCurrentPage(0);
      prevFilterHashRef.current = currentFilterHash;
    }
  }, [sorting, filters, limit]);

  // Add flexible select/actions column
  const enhancedColumns = useMemo(() => {
    const hasActions = actions && actions.length > 0;
    const isSelectable = selectable;

    // If no actions and not selectable, return original columns
    if (!hasActions && !isSelectable) {
      return columns;
    }

    // Always use the enhanced first column approach
    if (columns.length > 0) {
      const [firstColumn, ...restColumns] = columns;
      const enhancedFirstColumn = enhanceFirstColumnWithSelectActions(firstColumn, {
        selectable,
        actions,
      });
      return [enhancedFirstColumn, ...restColumns];
    }

    return columns;
  }, [selectable, actions, columns]);

  const table = useReactTable<TData>({
    data: rows,
    columns: enhancedColumns,
    rowCount: rows.length,
    state: {
      pagination: { pageIndex: currentPage, pageSize: limit },
      sorting: sorting ?? [],
      columnVisibility: columnVisibility ?? {},
      columnPinning: columnPinning ?? {},
      columnOrder: columnOrder ?? [],
      rowSelection: rowSelection ?? {},
    },
    manualPagination: true,
    manualSorting: !!setSorting,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onColumnOrderChange: setColumnOrder,
    onRowSelectionChange: setRowSelection,
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
    getRowId: getRowId,
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

  return (
    <DataTableContext.Provider value={value}>
      {typeof children === 'function' ? children(value) : children}
    </DataTableContext.Provider>
  );
}
