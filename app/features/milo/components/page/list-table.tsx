import {
  LIST_TABLE_BODY_CLASS,
  LIST_TABLE_CELL_CLASS,
  LIST_TABLE_HEADER_CELL_CLASS,
  LIST_TABLE_HEADER_CLASS,
  LIST_TABLE_HEADER_ROW_CLASS,
  LIST_TABLE_ROW_CLASS,
  SECTION_CARD_CHROME,
} from '../../lib/card-chrome';
import { FILTER_W } from '../../lib/dimensions';
import { ListPagination } from './list-pagination';
import {
  buildFilterFns,
  computeFacetCounts,
  FilterGroup,
  FilterGroupSkeleton,
  FilterPanel,
  InlineFilterBar,
  MobileFilterButton,
  type FilterGroupConfig,
} from './rich-filter-panel';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { ACTION_ICONS, STATUS_ICONS } from '@/utils/config/icons.config';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  DataTable,
  useDataTableFilters,
  useDataTableSearch,
} from '@datum-cloud/datum-ui/data-table';
import type { SelectionColumnOptions } from '@datum-cloud/datum-ui/data-table';
import { Input } from '@datum-cloud/datum-ui/input';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronLeft } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

/** Skeleton rows while list data loads — capped so pageSize=100 doesn't paint 100 placeholders. */
const LOADING_SKELETON_ROWS = 8;

function ListTableBodySkeleton({ columnCount }: { columnCount: number }) {
  const cols = Math.max(columnCount, 1);
  return (
    <div className="min-h-0 flex-1 overflow-hidden" data-slot="dt-loading" aria-busy="true">
      <div
        className={cn(
          'flex h-9 items-center border-b border-[#efefed] bg-[#fbfbfa] px-4',
          'dark:border-border dark:bg-muted'
        )}>
        {Array.from({ length: cols }, (_, i) => (
          <div key={i} className="min-w-0 flex-1 px-2 first:pl-0 last:pr-0">
            <Skeleton className="h-2.5 w-16" />
          </div>
        ))}
      </div>
      {Array.from({ length: LOADING_SKELETON_ROWS }, (_, row) => (
        <div
          key={row}
          className="border-border flex h-10 items-center border-b px-4"
          data-slot="dt-skeleton-row">
          {Array.from({ length: cols }, (_, col) => (
            <div key={col} className="min-w-0 flex-1 px-2 first:pl-0 last:pr-0">
              <Skeleton
                className={cn('h-4', col % 3 === 0 ? 'w-3/4' : col % 3 === 1 ? 'w-1/2' : 'w-2/3')}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Externally-controlled search (server-side): the input is driven by the caller, client filtering is off. */
export interface ControlledSearch {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Compact list table for staff-portal (#778). Wraps datum-ui's headless
 * `DataTable` into a styled block: filter sidebar | [action bar → table card].
 * Routes declare what table they want; density/layout lives here.
 */

const containerClass = cn(SECTION_CARD_CHROME, 'flex min-h-0 flex-1 flex-col overflow-hidden');

// [&>div]:overflow-visible neutralizes shadcn <Table>'s inner overflow-x wrapper
// so the sticky <th> resolves to this scroll container, not that wrapper.
const contentClassName = 'min-h-0 flex-1 overflow-auto [&>div]:overflow-visible';

const headerClassName = LIST_TABLE_HEADER_CLASS;
const headerRowClassName = LIST_TABLE_HEADER_ROW_CLASS;
const headerCellClassName = LIST_TABLE_HEADER_CELL_CLASS;
const bodyClassName = LIST_TABLE_BODY_CLASS;
const rowClassName = LIST_TABLE_ROW_CLASS;
const cellClassName = LIST_TABLE_CELL_CLASS;

const searchClassName =
  'h-10 border-0 bg-transparent pl-9 shadow-none focus-visible:shadow-none focus-visible:ring-0';

/**
 * Lives inside `<DataTable.Client>` so it can read active filters/search and
 * recompute facet counts when selection changes (Amazon-style: each group's
 * counts reflect every *other* active filter).
 */
function SidebarFilterGroups<TData>({
  filters,
  filterFns,
  data,
  loading,
  searchFn,
  applyClientSearch,
}: {
  filters: FilterGroupConfig[];
  filterFns?: Record<string, (cellValue: unknown, filterValue: unknown) => boolean>;
  data: TData[];
  loading: boolean;
  searchFn?: (row: TData, search: string) => boolean;
  /** False when search is server-driven (`controlledSearch`) — `data` is already scoped. */
  applyClientSearch: boolean;
}) {
  const { filters: activeFilters } = useDataTableFilters();
  const { search } = useDataTableSearch();

  const filterSignature = useMemo(
    () =>
      filters
        .map(
          (f) => `${f.column}:${f.type ?? 'checkbox'}:${f.options.map((o) => o.value).join(',')}`
        )
        .join('|'),
    [filters]
  );

  const matchers = useMemo(
    () => ({ ...buildFilterFns(filters), ...filterFns }),
    // filterSignature stands in for `filters` content — see ListTable comment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterSignature, filterFns]
  );

  const facetCounts = useMemo(
    () =>
      computeFacetCounts(data, filters, activeFilters, matchers, {
        search: applyClientSearch ? search : '',
        searchFn: applyClientSearch ? searchFn : undefined,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, filterSignature, activeFilters, matchers, applyClientSearch, search, searchFn]
  );

  return (
    <FilterPanel>
      {loading
        ? filters.map((f) => (
            <FilterGroupSkeleton key={f.column} label={f.label} optionCount={f.options.length} />
          ))
        : filters.map((f) => <FilterGroup key={f.column} {...f} counts={facetCounts[f.column]} />)}
    </FilterPanel>
  );
}

interface ListTableProps<TData> {
  readonly data: TData[];
  // columnHelper produces ColumnDef<TData, any>; `unknown` would be too strict for callers.
  readonly columns: ColumnDef<TData, any>[];
  readonly loading?: boolean;
  readonly pageSize?: number;
  /** Shown in the footer range: `1-100 of N {resourceLabel}`. */
  readonly resourceLabel?: string;
  readonly getRowId?: (row: TData) => string;
  readonly defaultSort?: React.ComponentProps<typeof DataTable.Client<TData>>['defaultSort'];
  readonly searchFn?: (row: TData, search: string) => boolean;
  readonly filterFns?: Record<string, (cellValue: unknown, filterValue: unknown) => boolean>;
  /** Optional page title; the breadcrumb usually names the section, so most list pages omit it. */
  readonly title?: ReactNode;
  /** Optional total count shown next to the title, e.g. "Organizations (124)". */
  readonly count?: number;
  /** Primary CTA slot, right-aligned in the action bar above the table. */
  readonly actions?: ReactNode;
  readonly searchPlaceholder?: string;
  readonly emptyMessage?: ReactNode;
  /** Drive the search input externally (server-side search). When set, client `searchFn` is bypassed — `data` is rendered as-is. */
  readonly controlledSearch?: ControlledSearch;
  /** Show a "more results exist" hint by the pagination (e.g. server caps responses). */
  readonly hasMore?: boolean;
  /** Tooltip text for the `hasMore` hint. */
  readonly hasMoreMessage?: string;
  /** Filter groups. Each group's matcher is auto-wired into `filterFns` — declare the column once. */
  readonly filters?: FilterGroupConfig[];
  /** How filters render: `sidebar` (rich left rail, for main lists) or `inline` (dropdowns above the table, for detail tabs). Default `sidebar`. */
  readonly filterLayout?: 'sidebar' | 'inline';
  /** Horizontal inset: `page` (px-6, main lists) or `tab` (px-4, aligns with a detail page's EntityHeader). Default `page`. */
  readonly inset?: 'page' | 'tab';
  /** Enable row-selection checkboxes (forwarded to DataTable). Pair with `bulkActions`. */
  readonly enableRowSelection?: boolean | SelectionColumnOptions<TData>;
  /** Bulk-action bar shown above the table; receives the selected rows. Render `null` when none selected. */
  readonly bulkActions?: (selectedRows: TData[]) => ReactNode;
  /** Optional slot between the search bar and the table (active-filter chips, etc.). */
  readonly toolbar?: ReactNode;
}

export function ListTable<TData>({
  title,
  count,
  actions,
  searchPlaceholder,
  emptyMessage,
  filters,
  filterLayout = 'sidebar',
  inset = 'page',
  filterFns,
  bulkActions,
  toolbar,
  searchFn,
  controlledSearch,
  hasMore = false,
  hasMoreMessage,
  resourceLabel,
  loading = false,
  ...options
}: ListTableProps<TData>) {
  const { t } = useLingui();
  // Tablet (e.g. a phone in landscape) is just as cramped as mobile once the
  // nav rail + a 240px inline sidebar are both on screen, so treat anything
  // below desktop the same way: swap the sidebar for a Sheet trigger.
  const isCompact = useBreakpoint() !== 'desktop';
  const showHeader = title != null || actions != null || bulkActions != null;
  const hasFilters = (filters?.length ?? 0) > 0;
  const sidebarMode = hasFilters && filterLayout === 'sidebar';
  const showSidebar = sidebarMode && !isCompact;
  const showMobileFilter = sidebarMode && isCompact;
  const hasInlineFilters = hasFilters && filterLayout === 'inline';
  const insetX = inset === 'tab' ? 'px-4' : 'px-6';
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  // Auto-wire each filter group's matcher by its column; caller `filterFns` win.
  const mergedFilterFns = useMemo(
    () => ({ ...buildFilterFns(filters ?? []), ...filterFns }),
    [filters, filterFns]
  );

  return (
    // [sidebar | right column]; sidebar is inside DataTable.Client so its filters resolve.
    <DataTable.Client
      className="relative flex min-h-0 flex-1"
      filterFns={mergedFilterFns}
      // Controlled (server) search already filtered `data`, so keep every row.
      searchFn={controlledSearch ? () => true : searchFn}
      // Figma org-list footer defaults to 100; denser rows support a larger page.
      pageSize={100}
      loading={loading}
      {...options}
      // columnHelper yields ColumnDef<TData, any>; DataTable.Client now wants
      // <TData, unknown> — a type-identity narrowing that's safe at runtime.
      columns={options.columns as ColumnDef<TData, unknown>[]}>
      {showSidebar && (
        // Animate width (like the left nav) rather than mount/unmount; inner
        // stays FILTER_W wide so content doesn't reflow while it slides.
        // Drop border-r when collapsed so it doesn't stack with the sub-nav's
        // border into a thick double line.
        <aside
          style={{ width: filtersCollapsed ? 0 : FILTER_W }}
          className={cn(
            'bg-background shrink-0 overflow-hidden transition-[width]',
            !filtersCollapsed && 'border-r'
          )}>
          <div style={{ width: FILTER_W }} className="h-full overflow-y-auto pb-4">
            <SidebarFilterGroups
              filters={filters ?? []}
              filterFns={filterFns}
              data={options.data}
              loading={loading}
              searchFn={searchFn}
              applyClientSearch={!controlledSearch}
            />
          </div>
        </aside>
      )}
      {showSidebar && (
        // Collapse toggle straddling the divider; flips to › when collapsed. The
        // absolute positioning lives on this wrapper (Tooltip wraps the button in
        // its own `relative` span, which would otherwise be the offset parent).
        // When collapsed, sit on the sub-nav border (half outside) — ListPage
        // allows overflow so the overhang isn't clipped.
        <div
          style={{ left: filtersCollapsed ? -12 : FILTER_W - 12 }}
          className="absolute top-8 z-20 transition-[left]">
          <Tooltip message={filtersCollapsed ? t`Show filters` : t`Hide filters`} side="right">
            <button
              type="button"
              onClick={() => setFiltersCollapsed((c) => !c)}
              aria-label={filtersCollapsed ? t`Show filters` : t`Hide filters`}
              className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground flex size-[25px] items-center justify-center rounded-full border transition-[color,background-color]">
              <ChevronLeft className={cn('size-3.5', filtersCollapsed && 'rotate-180')} />
            </button>
          </Tooltip>
        </div>
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {showHeader && (
          <div className={cn('flex min-h-9 items-center justify-between gap-4 pt-6', insetX)}>
            <div className="flex min-w-0 items-center gap-3">
              {(title != null || typeof count === 'number') && (
                <Title as="h1" className="text-xl font-semibold">
                  {title}
                  {typeof count === 'number' && (
                    <Text as="span" textColor="muted" weight="normal" className="ml-2">
                      ({count})
                    </Text>
                  )}
                </Title>
              )}
              {/* Bulk-action bar (left, opposite the CTAs); null until rows are selected. */}
              {bulkActions && <DataTable.BulkActions>{bulkActions}</DataTable.BulkActions>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        <div className={cn('flex min-h-0 flex-1 flex-col py-4', insetX)}>
          <div className={containerClass}>
            <div className="flex shrink-0 items-center gap-1 border-b pr-2">
              <div className="relative min-w-0 flex-1">
                <ACTION_ICONS.search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                {controlledSearch ? (
                  <Input
                    placeholder={searchPlaceholder}
                    value={controlledSearch.value}
                    onChange={(e) => controlledSearch.onChange(e.target.value)}
                    className={searchClassName}
                  />
                ) : (
                  <DataTable.Search placeholder={searchPlaceholder} className={searchClassName} />
                )}
              </div>
              {/* Mobile: filters move into a Sheet so the table keeps full width. */}
              {showMobileFilter && <MobileFilterButton filters={filters ?? []} loading={loading} />}
            </div>
            {hasInlineFilters && (
              <div className="shrink-0 border-b px-3 py-2">
                <InlineFilterBar filters={filters ?? []} loading={loading} />
              </div>
            )}
            {toolbar}
            {loading ? (
              <ListTableBodySkeleton columnCount={options.columns.length} />
            ) : (
              <DataTable.Content
                className={contentClassName}
                headerClassName={headerClassName}
                headerRowClassName={headerRowClassName}
                headerCellClassName={headerCellClassName}
                bodyClassName={bodyClassName}
                rowClassName={rowClassName}
                cellClassName={cellClassName}
                emptyMessage={emptyMessage}
              />
            )}
          </div>
          <div className="mt-4 flex shrink-0 items-center gap-2">
            {hasMore && !loading && (
              <Tooltip
                side="right"
                message={
                  hasMoreMessage ??
                  t`The list is limited to 2,000 results at a time. Refine your search to surface other items.`
                }>
                <Button
                  type="warning"
                  theme="borderless"
                  size="icon"
                  className="size-7 hover:bg-transparent"
                  icon={<STATUS_ICONS.info className="size-4" />}
                />
              </Tooltip>
            )}
            {loading ? (
              <div className="flex h-7 w-full items-center justify-between gap-3">
                <Skeleton className="h-7 w-[158px]" />
                <Skeleton className="h-7 w-[180px]" />
              </div>
            ) : (
              <ListPagination className="min-w-0 flex-1" resourceLabel={resourceLabel} />
            )}
          </div>
        </div>
      </div>
    </DataTable.Client>
  );
}
