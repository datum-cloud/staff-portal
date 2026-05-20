import { DataTableToolbar } from '@/components/data-table-toolbar';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Input } from '@datum-cloud/datum-ui/input';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { t } from '@lingui/core/macro';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Info } from 'lucide-react';
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
  /** Optional filter controls rendered in the toolbar. */
  filters?: ReactNode;
  /** Optional extra slot rendered at the end of the toolbar row. */
  toolbarExtras?: ReactNode;
}

/**
 * Shared shell for resource list tables — a `DataTable.Client` wrapped in the
 * standard Card layout with a search toolbar, content area and pagination.
 *
 * Supports two search modes:
 * - uncontrolled: a `<DataTable.Search />` filters the in-memory `data` via
 *   `searchFn` (the default for project-scoped lists).
 * - controlled: pass `controlledSearch` and the input becomes controlled —
 *   the caller is expected to refetch with the query (used by global,
 *   search-API-backed views). `hasMore` then surfaces a "more results" hint.
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
    <DataTable.Client
      loading={loading}
      data={data}
      columns={columns}
      pageSize={pageSize}
      getRowId={getRowId}
      defaultSort={defaultSort}
      // In controlled mode the caller already filtered server-side, so keep
      // every row. Otherwise defer to the caller-supplied predicate.
      searchFn={controlledSearch ? () => true : searchFn}>
      <Card className="m-4 py-4 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <DataTableToolbar
            search={
              controlledSearch ? (
                <Input
                  placeholder={searchPlaceholder ?? t`Search...`}
                  value={controlledSearch.value}
                  onChange={(e) => controlledSearch.onChange(e.target.value)}
                  className="w-full md:w-64"
                />
              ) : (
                <DataTable.Search
                  placeholder={searchPlaceholder ?? t`Search...`}
                  className="w-full md:w-64"
                />
              )
            }
            filters={filters}
            extras={toolbarExtras}
          />
          <DataTable.Content
            headerClassName="bg-muted/50"
            className="border-t border-b border-solid"
            emptyMessage={emptyMessage ?? t`No results found.`}
          />
          <div className="flex items-center px-2">
            {hasMore && (
              <Tooltip
                side="right"
                message={
                  hasMoreMessage ??
                  t`The list is limited to 100 results at a time. Refine your search to surface other items.`
                }>
                <Button
                  className="mt-4 hover:bg-transparent"
                  type="warning"
                  theme="borderless"
                  size="icon"
                  icon={<Info className="size-4" />}
                />
              </Tooltip>
            )}
            <DataTable.Pagination className="flex-1 pb-0" />
          </div>
        </CardContent>
      </Card>
    </DataTable.Client>
  );
}
