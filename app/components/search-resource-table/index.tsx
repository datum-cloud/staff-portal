import { ListTable } from '@/features/milo';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import type { ReactNode } from 'react';

export interface ControlledSearch {
  value: string;
  onChange: (value: string) => void;
}

export interface SearchResourceTableProps<TData> {
  data: TData[];
  loading?: boolean;
  columns: ColumnDef<TData, any>[];
  getRowId?: (row: TData) => string;
  defaultSort?: SortingState;
  pageSize?: number;
  /**
   * Client-side filter predicate. Ignored when `controlledSearch` is set —
   * in that mode the caller refetches and `data` is already filtered, so
   * every row is rendered as-is.
   */
  searchFn?: (row: TData, search: string) => boolean;
  /**
   * If set, the search input is controlled externally and client-side
   * filtering is disabled. Used by global views backed by the search API,
   * where the dataset can exceed the rows held in memory.
   */
  controlledSearch?: ControlledSearch;
  /**
   * When true, surfaces an info hint next to the pagination indicating that
   * more results exist than what's currently loaded (the search API caps a
   * response at 100 rows).
   */
  hasMore?: boolean;
  /** Tooltip text for the `hasMore` info hint. */
  hasMoreMessage?: string;
  searchPlaceholder?: string;
  emptyMessage?: ReactNode;
  /** Optional filter controls rendered above the table. */
  filters?: ReactNode;
  /** Optional extra slot rendered above the table, after the filters. */
  toolbarExtras?: ReactNode;
}

/**
 * Shared shell for resource list tables — now a thin wrapper over the Milo
 * `ListTable` (compact card, sticky header, filter sidebar, compact pagination).
 *
 * Supports two search modes:
 * - uncontrolled: the built-in search filters the in-memory `data` via `searchFn`.
 * - controlled: pass `controlledSearch` and the input becomes controlled — the
 *   caller refetches with the query (used by global, search-API-backed views).
 *   `hasMore` then surfaces a "more results" hint by the pagination.
 */
export function SearchResourceTable<TData>({
  data,
  loading = false,
  columns,
  getRowId,
  defaultSort,
  pageSize = 20,
  searchFn,
  controlledSearch,
  hasMore = false,
  hasMoreMessage,
  searchPlaceholder,
  emptyMessage,
  filters,
  toolbarExtras,
}: SearchResourceTableProps<TData>) {
  return (
    <ListTable
      inset="tab"
      loading={loading}
      data={data}
      columns={columns}
      pageSize={pageSize}
      getRowId={getRowId}
      defaultSort={defaultSort}
      searchFn={searchFn}
      controlledSearch={controlledSearch}
      hasMore={hasMore}
      hasMoreMessage={hasMoreMessage}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      toolbar={
        filters || toolbarExtras ? (
          <div className="flex items-center gap-2 px-3 py-2">
            {filters}
            {toolbarExtras}
          </div>
        ) : undefined
      }
    />
  );
}
