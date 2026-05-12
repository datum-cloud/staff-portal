'use client';

import { searchResourcePageQuery, type SearchResourcePage } from '@/resources/request/client';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Input } from '@datum-cloud/datum-ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useQuery } from '@tanstack/react-query';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { parseAsInteger, parseAsString, useQueryStates, type Parser } from 'nuqs';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// ── Types ───────────────────────────────────────────────────────────────────
//
// Designed to match `@datum-cloud/datum-ui`'s DataTable.Server mental model
// (columns + fetchFn + transform + getRowId) so this component can be swapped
// back for `DataTable.Server` later — same column definitions, same row data
// shape, same hybrid list/search semantics.

export interface ResourceTarget {
  group: string;
  version: string;
  kind: string;
}

export type ResourcePage<T> = SearchResourcePage<T>;

/**
 * List endpoint invoked when the search box is empty. Owns the page's natural
 * ordering (typically creation-time descending) and pagination cursor. The
 * `filters` argument carries current filter state so the page can translate
 * to whatever its API accepts (e.g. k8s `fieldSelector`); implementations that
 * don't filter server-side should ignore it.
 */
export type ResourceListFn<T> = (args: {
  limit: number;
  cursor?: string;
  filters: Record<string, unknown>;
}) => Promise<ResourcePage<T>>;

export interface ResourceTableProps<T> {
  /** Search API target. Used only when the search input is non-empty. */
  resource: ResourceTarget;
  /** List endpoint. Used when the search input is empty. */
  list: ResourceListFn<T>;
  columns: ColumnDef<T, any>[];
  getRowId: (row: T) => string;
  /**
   * URL-state parsers for filters, keyed by column id. The first value passed
   * is frozen — swapping parsers at runtime is not supported. Prefer a
   * module-level constant.
   */
  filterParsers?: Record<string, Parser<any>>;
  limit?: number;
  /** Page-size options shown in the pagination dropdown. Defaults to [10, 20, 50, 100]. */
  pageSizes?: readonly number[];
  /** Optional override for the React Query cache key prefix. */
  queryKey?: readonly unknown[];
  searchPlaceholder?: string;
  emptyMessage?: ReactNode;
  /** Toolbar filter controls rendered alongside the search input. */
  filters?: ReactNode;
}

// ── URL state ──────────────────────────────────────────────────────────────

const CORE_PARSERS = {
  q: parseAsString.withDefault(''),
  size: parseAsInteger.withDefault(20),
};

const NOOP_FILTER_PARSERS: Record<string, Parser<any>> = {
  _unused: parseAsString.withDefault(''),
};

// ── Component ───────────────────────────────────────────────────────────────

export function ResourceTable<T>({
  resource,
  list,
  columns,
  getRowId,
  filterParsers,
  limit = 20,
  pageSizes = [10, 20, 50, 100],
  queryKey,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results.',
  filters,
}: ResourceTableProps<T>) {
  // Freeze filter parsers on first render — module-level callers stay stable,
  // and accidental inline literals don't churn the nuqs subscription.
  const [stableFilterParsers] = useState(() => filterParsers ?? NOOP_FILTER_PARSERS);
  const [coreState, setCoreState] = useQueryStates(CORE_PARSERS);
  const [filterState, setFilterState] = useQueryStates(stableFilterParsers);

  const pageSize = coreState.size || limit;
  const searchQuery = coreState.q.trim();

  // Latest refs so the queryFn closure stays free of churning identities.
  const listRef = useRef(list);
  const resourceRef = useRef(resource);
  useLayoutEffect(() => {
    listRef.current = list;
    resourceRef.current = resource;
  });

  // Cursor stack: index i holds the cursor used to fetch page i. Page 0 has
  // no cursor. The next-page cursor for page i is captured when page i's
  // response arrives (see effect below).
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  // Reset pagination when the query parameters (search or filters) change.
  // We compare a serialized signature so renders driven only by pageIndex
  // don't trip the reset.
  const filtersForRequest =
    stableFilterParsers === NOOP_FILTER_PARSERS ? {} : (filterState as Record<string, unknown>);
  const querySignature = JSON.stringify({ q: searchQuery, size: pageSize, f: filtersForRequest });
  const prevSignatureRef = useRef(querySignature);
  if (prevSignatureRef.current !== querySignature) {
    prevSignatureRef.current = querySignature;
    if (pageIndex !== 0) setPageIndex(0);
    if (cursorStack.length !== 1) setCursorStack([undefined]);
  }

  const cursor = cursorStack[pageIndex];

  const queryResult = useQuery({
    queryKey: [
      ...(queryKey ?? ['resource-table', resource.kind]),
      { q: searchQuery, size: pageSize, cursor, filters: filtersForRequest },
    ],
    queryFn: async () => {
      if (searchQuery) {
        return searchResourcePageQuery<T>({
          target: resourceRef.current,
          query: searchQuery,
          limit: pageSize,
          cursor,
        });
      }
      return listRef.current({ limit: pageSize, cursor, filters: filtersForRequest });
    },
    placeholderData: (previous) => previous,
  });

  // Capture the next-page cursor once the current page resolves.
  useEffect(() => {
    if (!queryResult.data) return;
    setCursorStack((prev) => {
      if (prev.length > pageIndex + 1) return prev;
      if (!queryResult.data!.continue) return prev;
      const next = prev.slice();
      next[pageIndex + 1] = queryResult.data!.continue;
      return next;
    });
  }, [queryResult.data, pageIndex]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<T>({
    data: queryResult.data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    manualPagination: true,
    // Sorting isn't wired to the server (neither the list nor search API
    // exposes a sort parameter today), so disable the column-header sort
    // controls entirely. Re-enable per-column or globally once the API
    // supports sort.
    enableSorting: false,
  });

  // Debounced search input.
  const [searchInput, setSearchInput] = useState(coreState.q);
  useEffect(() => {
    if (searchInput === coreState.q) return;
    const t = setTimeout(() => setCoreState({ q: searchInput }), 300);
    return () => clearTimeout(t);
  }, [searchInput, coreState.q, setCoreState]);

  const setFilter = useCallback(
    (key: string, value: unknown) => {
      setFilterState({ [key]: value ?? null } as any);
    },
    [setFilterState]
  );

  const canPrev = pageIndex > 0;
  const canNext = !!queryResult.data?.continue;
  const colCount = columns.length;

  return (
    <ResourceTableContext.Provider value={{ filterState: filtersForRequest, setFilter }}>
      <Card className="m-4 py-4 shadow-none">
        <CardContent className="flex flex-col gap-3 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full md:w-64"
            />
            {filters}
          </div>

          <div className="relative overflow-hidden rounded-md border">
            {queryResult.isFetching && !queryResult.isLoading && (
              <div
                className="bg-primary/70 absolute inset-x-0 top-0 z-10 h-0.5 animate-pulse"
                aria-hidden
              />
            )}
            <Table>
              <TableHeader className="bg-muted/50">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead key={h.id} colSpan={h.colSpan}>
                        {h.isPlaceholder
                          ? null
                          : flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody
                className={cn(
                  queryResult.isFetching &&
                    !queryResult.isLoading &&
                    'opacity-60 transition-opacity'
                )}>
                {queryResult.isLoading ? (
                  Array.from({ length: Math.min(pageSize, 10) }).map((_, rowIdx) => (
                    <TableRow key={rowIdx} data-slot="dt-skeleton-row">
                      {Array.from({ length: colCount }).map((__, colIdx) => (
                        <TableCell key={colIdx}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : queryResult.error ? (
                  <TableRow>
                    <TableCell colSpan={colCount} className="text-destructive h-24 text-center">
                      {(queryResult.error as Error).message || 'Failed to load.'}
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colCount} className="h-24 text-center">
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            cell.column.id === 'actions' && 'bg-background sticky right-0'
                          )}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span>Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setCoreState({ size: Number(v) })}>
                <SelectTrigger className="h-8 w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizes.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                theme="outline"
                size="small"
                htmlType="button"
                disabled={!canPrev || queryResult.isFetching}
                onClick={() => setPageIndex(pageIndex - 1)}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                theme="outline"
                size="small"
                htmlType="button"
                disabled={!canNext || queryResult.isFetching}
                onClick={() => setPageIndex(pageIndex + 1)}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </ResourceTableContext.Provider>
  );
}

// ── Filter slot helpers ─────────────────────────────────────────────────────
//
// Toolbar filter controls don't have direct access to filter state, so we
// expose a small context. Filter components passed via the `filters` prop can
// read/write the current filter values via `useResourceTableFilters()`.

interface ResourceTableContextValue {
  filterState: Record<string, unknown>;
  setFilter: (key: string, value: unknown) => void;
}

const ResourceTableContext = createContext<ResourceTableContextValue | null>(null);

export function useResourceTableFilters() {
  const ctx = useContext(ResourceTableContext);
  if (!ctx) {
    throw new Error('useResourceTableFilters must be used inside <ResourceTable>');
  }
  return ctx;
}
