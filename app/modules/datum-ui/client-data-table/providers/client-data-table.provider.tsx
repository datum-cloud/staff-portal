import type { UseClientDataTableQueryReturn } from '../hooks/useClientDataTableQuery';
import {
  createActionsColumn,
  enhanceFirstColumnWithSelection,
  type ActionItem,
} from '@datum-ui/data-table/components/data-table-select-actions';
import { UseQueryResult } from '@tanstack/react-query';
import {
  ColumnDef,
  FilterFn,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  useReactTable,
} from '@tanstack/react-table';
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';

// Define the context type
export type ClientDataTableContextType<TData, TQuery = TData | TData[]> = {
  table: ReturnType<typeof useReactTable<TData>>;
  query: UseQueryResult<TQuery>;
  search?: string;
  setSearch?: (value: string) => void;
  clearSearch?: () => void;
  filters: Record<string, any>;
  setFilter: (filterKey: string, value: any) => void;
  clearFilter: (filterKey: string) => void;
  useSorting: boolean;
  useSearch: boolean;
  useFilters: boolean;
};

// Keep a default context for backward compatibility
export const ClientDataTableContext = createContext<ClientDataTableContextType<any, any> | null>(
  null
);

// Type-safe hook that infers types from the provider
export function useClientDataTableInstance<
  TData = any,
  TQuery = TData | TData[],
>(): ClientDataTableContextType<TData, TQuery> {
  const ctx = useContext(ClientDataTableContext);
  if (!ctx) {
    throw new Error('useClientDataTableInstance must be used inside ClientDataTableProvider');
  }
  return ctx as ClientDataTableContextType<TData, TQuery>;
}

interface ClientDataTableProviderProps<TData, TQuery = TData | TData[]>
  extends Omit<UseClientDataTableQueryReturn<TQuery>, 'query'> {
  columns: ColumnDef<TData, any>[];
  query: UseQueryResult<TQuery>;
  transform?: (raw: TQuery) => TData[];
  selectable?: boolean;
  actions?: ActionItem<TData>[];
  actionsLoading?: boolean | ((row: TData) => boolean);
  getRowId?: (row: TData, index: number, parent?: any) => string;

  // Custom filter function for applying filters to data
  filterFn?: (row: TData, filters: Record<string, any>) => boolean;
  // Custom search function for global search (TanStack Table FilterFn)
  // If not provided, uses default that searches across all visible column values
  globalFilterFn?: FilterFn<TData>;

  children:
    | React.ReactNode
    | ((context: ClientDataTableContextType<TData, TQuery>) => React.ReactNode);
}

export function ClientDataTableProvider<TData, TQuery = TData | TData[]>({
  columns,
  query,
  transform,
  selectable = false,
  actions,
  actionsLoading,
  getRowId,
  children,
  // Spread props from useClientDataTableQuery
  pageSize,
  pageIndex,
  sorting,
  filters = {},
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
  setRowSelection,
  // Custom functions
  filterFn,
  globalFilterFn,
}: ClientDataTableProviderProps<TData, TQuery>) {
  // Use URL state directly - no need for local state
  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex: pageIndex ?? 0,
      pageSize: pageSize,
    }),
    [pageIndex, pageSize]
  );

  // Transform data to array format
  const allData = useMemo(() => {
    if (!query.data) return [];
    if (transform) {
      return transform(query.data);
    }
    // If data is already an array, return it
    if (Array.isArray(query.data)) {
      return query.data;
    }
    // Otherwise wrap in array
    return [query.data];
  }, [query.data, transform]);

  // Apply custom filters before passing to table
  const filteredData = useMemo(() => {
    if (!filterFn || Object.keys(filters).length === 0) {
      return allData;
    }

    return allData.filter((row) => filterFn(row, filters));
  }, [allData, filters, filterFn]);

  // Reset to first page when filters or search change
  const prevFiltersRef = useRef<string | null>(null);
  const prevSearchRef = useRef<string | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevFiltersRef.current = JSON.stringify(filters);
      prevSearchRef.current = search ?? null;
      return;
    }

    const filtersChanged =
      prevFiltersRef.current !== null && prevFiltersRef.current !== JSON.stringify(filters);
    const searchChanged = prevSearchRef.current !== (search ?? null);

    if (filtersChanged || searchChanged) {
      setPageIndex(0);
      prevFiltersRef.current = JSON.stringify(filters);
      prevSearchRef.current = search ?? null;
    }
  }, [filters, search, setPageIndex]);

  // Add selection to first column (embedded) and actions column (separate)
  const enhancedColumns = useMemo(() => {
    const hasActions = actions && actions.length > 0;
    const isSelectable = selectable;

    // If no actions and not selectable, return original columns
    if (!hasActions && !isSelectable) {
      return columns;
    }

    const newColumns = [...columns];

    // Enhance first column with selection checkbox (embedded, no extra space)
    if (isSelectable && newColumns.length > 0) {
      newColumns[0] = enhanceFirstColumnWithSelection(newColumns[0]);
    }

    // Add actions column at the end (right side)
    if (hasActions) {
      const actionsColumn = createActionsColumn({
        selectable: false, // Selection is handled by first column enhancement
        actions,
        loading: actionsLoading,
      });
      if (actionsColumn) {
        newColumns.push(actionsColumn);
      }
    }

    return newColumns;
  }, [selectable, actions, actionsLoading, columns]);

  // Default global filter function that searches across all visible column values
  const defaultGlobalFilterFn: FilterFn<TData> = useMemo(
    () => (row, _columnId, filterValue) => {
      const search = String(filterValue).toLowerCase();
      if (!search) return true;

      // Search across all visible columns
      return enhancedColumns.some((column) => {
        const colId =
          column.id || ('accessorKey' in column ? (column.accessorKey as string) : undefined);
        if (!colId) return false;
        const value = row.getValue(colId);
        if (value == null) return false;
        return String(value).toLowerCase().includes(search);
      });
    },
    [enhancedColumns]
  );

  const table = useReactTable<TData>({
    data: filteredData,
    columns: enhancedColumns,
    // Client-side operations - all manual flags are false
    manualPagination: false,
    manualSorting: false,
    manualFiltering: false,
    // State
    state: {
      pagination,
      sorting: sorting ?? [],
      globalFilter: search ?? '',
      columnVisibility: columnVisibility ?? {},
      columnPinning: columnPinning ?? {},
      columnOrder: columnOrder ?? [],
      rowSelection: rowSelection ?? {},
    },
    // Event handlers - update URL state directly
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      // Update pageSize in URL state when it changes
      if (next.pageSize !== pagination.pageSize) {
        setPageSize(next.pageSize);
      }
      // Update pageIndex in URL state when it changes
      if (next.pageIndex !== pagination.pageIndex) {
        setPageIndex(next.pageIndex);
      }
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onColumnOrderChange: setColumnOrder,
    onRowSelectionChange: setRowSelection,
    // Auto-reset page index when filtering/searching (TanStack Table feature)
    autoResetPageIndex: false, // We handle this manually in useEffect
    // Row models - all client-side
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: getRowId,
    // Custom filter functions
    filterFns: {} as any,
    // Use custom globalFilterFn if provided, otherwise use default
    globalFilterFn: globalFilterFn || defaultGlobalFilterFn,
  });

  const value = useMemo<ClientDataTableContextType<TData, TQuery>>(
    () => ({
      table,
      query,
      search,
      setSearch,
      clearSearch,
      filters,
      setFilter,
      clearFilter,
      useSorting,
      useSearch,
      useFilters,
    }),
    [
      table,
      query,
      search,
      setSearch,
      clearSearch,
      filters,
      setFilter,
      clearFilter,
      useSorting,
      useSearch,
      useFilters,
    ]
  );

  return (
    <ClientDataTableContext.Provider value={value}>
      {typeof children === 'function' ? children(value) : children}
    </ClientDataTableContext.Provider>
  );
}
