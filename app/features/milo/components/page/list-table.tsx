import { FILTER_W } from '../../lib/dimensions';
import {
  buildFilterFns,
  FilterGroup,
  FilterPanel,
  InlineFilterBar,
  MobileFilterButton,
  type FilterGroupConfig,
} from './rich-filter-panel';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { ACTION_ICONS, STATUS_ICONS } from '@/utils/config/icons.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import type { SelectionColumnOptions } from '@datum-cloud/datum-ui/data-table';
import { Input } from '@datum-cloud/datum-ui/input';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronLeft } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

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

const containerClass =
  'border-border bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border';

// [&>div]:overflow-visible neutralizes shadcn <Table>'s inner overflow-x wrapper
// so the sticky <th> resolves to this scroll container, not that wrapper.
const contentClassName = 'min-h-0 flex-1 overflow-auto [&>div]:overflow-visible';

// Sticky on <th> (not <thead>) for cross-browser support; translucent + blur frosts rows underneath.
// Note: no `uppercase` here — Tailwind Preflight resets text-transform on the
// <button> that sortable headers render, so it would only hit raw-string
// headers, making them inconsistent (UPPERCASE) with sortable ones.
const headerCellClassName =
  'sticky top-0 z-10 h-8 border-b border-border bg-background/50 backdrop-blur-sm px-3 text-xs font-medium tracking-wide text-muted-foreground';
const rowClassName = 'hover:bg-muted/30';
// py-0.5 keeps rows compact; multi-line cells (stacked endpoints/chips) grow with
// a little breathing room. The row-actions trigger and copy button both sit in
// many rows (ID columns), so shrink them — otherwise their default size sets
// the height of the whole table (rows with a copy button were ~6px taller
// than rows without one, e.g. Resources vs Users).
const cellClassName =
  'border-b border-border px-3 py-0.5 text-sm [&_[data-slot=dt-row-actions]]:!size-7 [&_[data-slot=dt-row-actions]]:!p-0 [&_[data-slot=button-copy]]:!size-5';

/** Resolves a dot-path (e.g. `status.registrationApproval`) against a plain object. */
function getByPath(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) => (acc && typeof acc === 'object' ? (acc as any)[key] : undefined),
      obj
    );
}

const searchClassName =
  'h-10 border-0 bg-transparent pl-9 shadow-none focus-visible:shadow-none focus-visible:ring-0';

// Shrink the rows-per-page trigger (data-slot, baked-in min-h-10/py-2) to match the h-8 buttons.
const paginationClass =
  'shrink-0 gap-2 p-0 mt-4 [&_[data-slot=select-trigger]]:!h-8 [&_[data-slot=select-trigger]]:!min-h-0 [&_[data-slot=select-trigger]]:!py-0 [&_[data-slot=select-trigger]]:gap-1 [&_[data-slot=select-trigger]]:px-2 [&_[data-slot=select-trigger]]:text-xs';

interface ListTableProps<TData> {
  readonly data: TData[];
  // columnHelper produces ColumnDef<TData, any>; `unknown` would be too strict for callers.
  readonly columns: ColumnDef<TData, any>[];
  readonly loading?: boolean;
  readonly pageSize?: number;
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

  // Structural signature of `filters` (column/type/option values) — routes pass
  // a fresh `filters={[...]}` array literal every render, so depending on that
  // reference (or on `mergedFilterFns`, which is built from it) would defeat
  // the memo below on every re-render instead of only when a filter's shape
  // actually changes.
  const filterSignature = useMemo(
    () =>
      (filters ?? [])
        .map(
          (f) => `${f.column}:${f.type ?? 'checkbox'}:${f.options.map((o) => o.value).join(',')}`
        )
        .join('|'),
    [filters]
  );

  // Per-option counts (e.g. "Approved (98)"), tallied from the full dataset via
  // each group's own matcher — so it works for exact-match checkboxes *and*
  // range-style filters (e.g. "Created: Last 7 days") alike. Sidebar only,
  // since inline/mobile variants render outside this data scope.
  const filterCounts = useMemo(() => {
    if (!sidebarMode || !filters?.length) return undefined;
    const autoFilterFns = buildFilterFns(filters);
    const counts: Record<string, Record<string, number>> = {};
    for (const group of filters) {
      const matcher = filterFns?.[group.column] ?? autoFilterFns[group.column];
      const tally: Record<string, number> = {};
      for (const option of group.options) {
        tally[option.value] = options.data.filter((row) =>
          matcher(getByPath(row, group.column), [option.value])
        ).length;
      }
      counts[group.column] = tally;
    }
    return counts;
    // filterSignature stands in for `filters`'/`filterFns`'s content — see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarMode, filterSignature, options.data]);

  return (
    // [sidebar | right column]; sidebar is inside DataTable.Client so its filters resolve.
    <DataTable.Client
      className="relative flex min-h-0 flex-1"
      filterFns={mergedFilterFns}
      // Controlled (server) search already filtered `data`, so keep every row.
      searchFn={controlledSearch ? () => true : searchFn}
      // Rows are denser now, so show more per page by default when a route doesn't pick one.
      pageSize={50}
      {...options}
      // columnHelper yields ColumnDef<TData, any>; DataTable.Client now wants
      // <TData, unknown> — a type-identity narrowing that's safe at runtime.
      columns={options.columns as ColumnDef<TData, unknown>[]}>
      {showSidebar && (
        // Animate width (like the left nav) rather than mount/unmount; inner
        // stays FILTER_W wide so content doesn't reflow while it slides.
        <aside
          style={{ width: filtersCollapsed ? 0 : FILTER_W }}
          className="bg-background shrink-0 overflow-hidden border-r transition-[width]">
          <div style={{ width: FILTER_W }} className="h-full overflow-y-auto pb-4">
            <FilterPanel>
              {filters?.map((f) => (
                <FilterGroup key={f.column} {...f} counts={filterCounts?.[f.column]} />
              ))}
            </FilterPanel>
          </div>
        </aside>
      )}
      {showSidebar && (
        // Collapse toggle straddling the divider; flips to › when collapsed. The
        // absolute positioning lives on this wrapper (Tooltip wraps the button in
        // its own `relative` span, which would otherwise be the offset parent).
        <div
          style={{ left: filtersCollapsed ? 8 : FILTER_W - 11 }}
          className="absolute top-8 z-20 transition-[left]">
          <Tooltip message={filtersCollapsed ? t`Show filters` : t`Hide filters`} side="right">
            <button
              type="button"
              onClick={() => setFiltersCollapsed((c) => !c)}
              aria-label={filtersCollapsed ? t`Show filters` : t`Hide filters`}
              className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground flex size-[25px] items-center justify-center rounded-full border shadow-sm transition-[color,background-color]">
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
              {showMobileFilter && <MobileFilterButton filters={filters ?? []} />}
            </div>
            {hasInlineFilters && (
              <div className="shrink-0 border-b px-3 py-2">
                <InlineFilterBar filters={filters ?? []} />
              </div>
            )}
            {toolbar}
            <DataTable.Content
              className={contentClassName}
              headerCellClassName={headerCellClassName}
              rowClassName={rowClassName}
              cellClassName={cellClassName}
              emptyMessage={emptyMessage}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasMore && (
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
                  className="mt-4 size-7 hover:bg-transparent"
                  icon={<STATUS_ICONS.info className="size-4" />}
                />
              </Tooltip>
            )}
            <DataTable.Pagination className={cn(paginationClass, 'flex-1')} />
          </div>
        </div>
      </div>
    </DataTable.Client>
  );
}
