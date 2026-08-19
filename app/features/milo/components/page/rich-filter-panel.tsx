import { ACTION_ICONS } from '@/utils/config/icons.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { useDataTableFilters } from '@datum-cloud/datum-ui/data-table';
import { Input } from '@datum-cloud/datum-ui/input';
import { Label } from '@datum-cloud/datum-ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { RadioGroup, RadioGroupItem } from '@datum-cloud/datum-ui/radio-group';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@datum-cloud/datum-ui/sheet';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Filter sidebar for list tables (#778). Wired via `useDataTableFilters`, so it
 * must render inside `<DataTable.Client>` (`<ListTable filters={…}>` does that).
 */

/** Matches a row's cell value against the active filter value for one column. */
export type FilterFn = (cellValue: unknown, filterValue: unknown) => boolean;

/** Multi-select matcher: pair with a {@link CheckboxFilterGroup} sharing the same key in `filterFns`. */
export const multiSelectFilterFn: FilterFn = (cellValue, filterValue) => {
  const selected = filterValue as unknown[] | undefined;
  if (!selected?.length) return true;
  return selected.map(String).includes(String(cellValue ?? ''));
};

/**
 * Multi-select against an array cell (e.g. org `memberIds`): row matches when
 * any selected value is present in the cell array.
 */
export const arrayIncludesAnyFilterFn: FilterFn = (cellValue, filterValue) => {
  const selected = filterValue as unknown[] | undefined;
  if (!selected?.length) return true;
  const values = Array.isArray(cellValue)
    ? cellValue.map(String)
    : cellValue == null
      ? []
      : [String(cellValue)];
  if (values.length === 0) return false;
  return selected.some((value) => values.includes(String(value)));
};

// Cumulative "created within" windows (in days since now) for
// dateRangeFilterFn — each wider window is a superset of the narrower ones,
// so e.g. "Last 30 days" can never show fewer rows than "Last 24 hours".
// (Non-overlapping bins were tried first and confusingly could show "Today: 9,
// This month: 0" — a row created today doesn't fall in a 7-30-day-old bin.)
const DATE_BUCKET_MAX_DAYS: Record<string, number> = {
  today: 1,
  week: 7,
  month: 30,
  quarter: 90,
};

/** Ready-made options for a "Created" style {@link DateRangeFilterConfig}. */
export const DATE_RANGE_OPTIONS: FilterOption[] = [
  { value: 'today', label: 'Last 24 hours' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'quarter', label: 'Last 90 days' },
  { value: 'older', label: 'Older than 90 days' },
];

/** Bucket matcher: pairs a timestamp column with {@link DATE_RANGE_OPTIONS}-style values. */
export const dateRangeFilterFn: FilterFn = (cellValue, filterValue) => {
  const selected = filterValue as string[] | undefined;
  if (!selected?.length) return true;
  if (!cellValue) return false;
  const ageDays = (Date.now() - new Date(cellValue as string).getTime()) / 86_400_000;
  return selected.some((bucket) => {
    if (bucket === 'older') return ageDays >= 90;
    const maxDays = DATE_BUCKET_MAX_DAYS[bucket];
    return maxDays !== undefined && ageDays < maxDays;
  });
};

const isActive = (value: unknown): boolean =>
  Array.isArray(value) ? value.length > 0 : value != null && value !== '';

/** Dot-path lookup for facet counting (mirrors DataTable's resolvePath). */
function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    return acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined;
  }, obj);
}

function matchesDateBucket(ageDays: number, bucket: string): boolean {
  if (bucket === 'older') return ageDays >= 90;
  const maxDays = DATE_BUCKET_MAX_DAYS[bucket];
  return maxDays !== undefined && ageDays < maxDays;
}

function rowMatchesOtherFilters(
  row: unknown,
  activeFilters: Record<string, unknown>,
  matchers: Record<string, FilterFn>,
  excludeColumn: string
): boolean {
  for (const [column, value] of Object.entries(activeFilters)) {
    if (column === excludeColumn || !isActive(value)) continue;
    const matcher = matchers[column];
    if (!matcher) continue;
    if (!matcher(getByPath(row, column), value)) return false;
  }
  return true;
}

/**
 * Facet counts for sidebar options: for each group, count rows that match all
 * *other* active filters (and optional search), then how many of those hit each
 * option. So selecting Project="Matt" shrinks Type/Created counts to that
 * project's rows — without locking the current group's own options at 0/N.
 *
 * Searchable (high-cardinality) groups are skipped. Complexity is
 * O(groups × rows × otherFilters) with a single pass per group to tally —
 * fine for list sizes we ship (thousands of rows, handful of options).
 */
export function computeFacetCounts<T>(
  data: T[],
  groups: FilterGroupConfig[],
  activeFilters: Record<string, unknown>,
  matchers: Record<string, FilterFn>,
  opts?: {
    search?: string;
    searchFn?: (row: T, search: string) => boolean;
  }
): Record<string, Record<string, number>> {
  const search = opts?.search?.trim() ?? '';
  const searchFn = opts?.searchFn;
  const counts: Record<string, Record<string, number>> = {};

  for (const group of groups) {
    if (group.type === 'searchable') continue;

    const tally: Record<string, number> = {};
    for (const option of group.options) tally[option.value] = 0;

    const base: T[] = [];
    for (const row of data) {
      if (search && searchFn && !searchFn(row, search)) continue;
      if (!rowMatchesOtherFilters(row, activeFilters, matchers, group.column)) continue;
      base.push(row);
    }

    if (group.type === 'dateRange') {
      const now = Date.now();
      for (const row of base) {
        const cell = getByPath(row, group.column);
        if (!cell) continue;
        const ageDays = (now - new Date(cell as string).getTime()) / 86_400_000;
        for (const option of group.options) {
          if (matchesDateBucket(ageDays, option.value)) tally[option.value]++;
        }
      }
    } else if (group.type === 'multi') {
      // Multi-value cell (string[]): count each contained value once per row.
      for (const row of base) {
        const cell = getByPath(row, group.column);
        if (!Array.isArray(cell)) continue;
        for (const v of cell) {
          const key = String(v);
          if (key in tally) tally[key]++;
        }
      }
    } else {
      // Exact-match checkboxes: one pass, key by stringified cell value.
      for (const row of base) {
        const key = String(getByPath(row, group.column) ?? '');
        if (key in tally) tally[key]++;
      }
    }

    counts[group.column] = tally;
  }

  return counts;
}

interface FilterPanelProps {
  children: ReactNode;
}

/** Sidebar shell: header (icon + "Filters" + active count + Clear all) over filter groups. */
export function FilterPanel({ children }: FilterPanelProps) {
  'use no memo';
  const { t } = useLingui();
  const { filters, clearAllFilters } = useDataTableFilters();
  const activeCount = Object.values(filters).filter(isActive).length;

  return (
    <div className="flex flex-col">
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <div className="text-foreground flex items-center gap-2">
          <ACTION_ICONS.filter className="size-4" />
          <Text size="sm" weight="medium">{t`Filters`}</Text>
        </div>
        {activeCount > 0 && (
          <div className="flex items-center gap-2">
            <Text size="xs" textColor="muted">
              {activeCount}
            </Text>
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground text-xs transition-colors">
              {t`Clear`}
            </button>
          </div>
        )}
      </div>
      {/* Each group owns its padding + full-bleed border-b. */}
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

export interface FilterOption {
  value: string;
  /** Plain text, or rich content — a `<Badge>` / `<BadgeState>` for status-style options. */
  label: ReactNode;
  /** Plain text for searchable matching when `label` is rich content. Falls back to `value`. */
  searchText?: string;
  /** Optional leading icon (e.g. Type / Usage rows); sized to 1rem, inherits row color. */
  icon?: ReactNode;
}

interface BaseFilterGroup {
  /** Dot-path filter key (e.g. `status.platformAccess`). `<ListTable filters>` auto-wires its matcher. */
  column: string;
  label: string;
}

/** Multi-select checkboxes — the default group type. */
export interface CheckboxFilterConfig extends BaseFilterGroup {
  type?: 'checkbox';
  options: FilterOption[];
}

/** Same checkbox UI, but matched via {@link dateRangeFilterFn} age buckets — pair with `DATE_RANGE_OPTIONS`. */
export interface DateRangeFilterConfig extends BaseFilterGroup {
  type: 'dateRange';
  options: FilterOption[];
}

/**
 * Search + capped list for high-cardinality filters (e.g. Organization on the
 * projects list). Uses the same multi-select matcher as checkbox filters.
 */
export interface SearchableFilterConfig extends BaseFilterGroup {
  type: 'searchable';
  options: FilterOption[];
  searchPlaceholder?: string;
  /** Options shown per "page" before Show more (default 8). */
  pageSize?: number;
  /** True while async search results are loading. */
  isSearching?: boolean;
  /**
   * Debounced (~300ms) callback for async option enrichment (e.g. GraphQL
   * search). The input itself stays local so typing doesn't re-render the
   * parent table.
   */
  onSearchChange?: (query: string) => void;
  /** Hint when the query is empty and there are no static options to browse. */
  emptyHint?: string;
}

/**
 * A filter group, discriminated by `type` (default `checkbox`). To add a type:
 * (1) add a `*FilterConfig` member to this union, (2) register its matcher in
 * {@link FILTER_MATCHERS}, (3) add a case to {@link FilterGroup} if it needs a
 * different renderer (checkbox-shaped types can reuse `CheckboxFilterGroup`).
 * Routes and `ListTable` stay untouched.
 */
/**
 * Multi-value column: the cell is a `string[]` (e.g. a grouped row's reasons),
 * matched when it contains any selected value. Same checkbox UI as `checkbox`.
 */
export interface MultiFilterConfig extends BaseFilterGroup {
  type: 'multi';
  options: FilterOption[];
}

export type FilterGroupConfig =
  | CheckboxFilterConfig
  | DateRangeFilterConfig
  | SearchableFilterConfig
  | MultiFilterConfig;

type FilterType = NonNullable<FilterGroupConfig['type']>;

/** type → row matcher. Exhaustive Record, so adding a type forces a matcher here. */
const FILTER_MATCHERS: Record<FilterType, FilterFn> = {
  checkbox: multiSelectFilterFn,
  dateRange: dateRangeFilterFn,
  searchable: multiSelectFilterFn,
  multi: arrayIncludesAnyFilterFn,
};

/** Column → matcher map for `DataTable.Client.filterFns`, derived from the configs. */
export function buildFilterFns(filters: FilterGroupConfig[]): Record<string, FilterFn> {
  return Object.fromEntries(filters.map((f) => [f.column, FILTER_MATCHERS[f.type ?? 'checkbox']]));
}

/** Renders the group component matching a config's `type`. */
export function FilterGroup(config: FilterGroupConfig & { counts?: Record<string, number> }) {
  if (config.type === 'searchable') {
    return <SearchableFilterGroup {...config} />;
  }
  return <CheckboxFilterGroup {...config} />;
}

/** Placeholder for one filter group while list data (and option counts) load. */
export function FilterGroupSkeleton({
  label,
  optionCount = 3,
}: {
  label?: ReactNode;
  optionCount?: number;
}) {
  const rows = Math.min(Math.max(optionCount, 2), 6);
  return (
    <div
      className="border-border flex flex-col gap-2 border-b px-4 py-3"
      data-slot="filter-group-skeleton"
      aria-hidden>
      <div className="flex h-5 items-center">
        {label != null ? (
          <Text size="sm" weight="medium">
            {label}
          </Text>
        ) : (
          <Skeleton className="h-3.5 w-20" />
        )}
      </div>
      <div className="flex flex-col gap-1">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1">
            <Skeleton className="size-4 shrink-0 rounded-sm" />
            <Skeleton className={cn('h-3.5 flex-1', i % 2 === 0 ? 'max-w-[70%]' : 'max-w-[55%]')} />
            <Skeleton className="h-3 w-5 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function optionSearchText(option: FilterOption): string {
  if (option.searchText) return option.searchText;
  if (typeof option.label === 'string') return option.label;
  return option.value;
}

function FilterOptionRow({
  option,
  counts,
}: {
  option: FilterOption;
  counts?: Record<string, number>;
}) {
  const count = counts?.[option.value];
  return (
    <>
      {option.icon && (
        <span className="flex shrink-0 items-center [&_svg]:size-4">{option.icon}</span>
      )}
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      {typeof count === 'number' && (
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{count}</span>
      )}
    </>
  );
}

const DEFAULT_SEARCHABLE_PAGE_SIZE = 8;

const SEARCHABLE_SEARCH_DEBOUNCE_MS = 300;

/** High-cardinality multi-select: search field + paginated matches, selected pinned on top. */
export function SearchableFilterGroup({
  column,
  label,
  options,
  counts,
  searchPlaceholder,
  pageSize = DEFAULT_SEARCHABLE_PAGE_SIZE,
  isSearching = false,
  onSearchChange,
  emptyHint,
}: SearchableFilterConfig & { counts?: Record<string, number> }) {
  'use no memo';
  const { t } = useLingui();
  const { filters, setFilter, clearFilter } = useDataTableFilters();
  const [open, setOpen] = useState(true);
  // Input state stays local so keystrokes don't re-render the parent list page.
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [knownLabels, setKnownLabels] = useState<Record<string, ReactNode>>({});

  useEffect(() => {
    if (!onSearchChange) return;
    const id = setTimeout(() => onSearchChange(query), SEARCHABLE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query, onSearchChange]);

  const selected = useMemo(
    () => (filters[column] as string[] | undefined) ?? [],
    [filters, column]
  );

  const handleQueryChange = (next: string) => {
    setQuery(next);
    setVisibleCount(pageSize);
  };

  const toggle = (option: FilterOption) => {
    const next = selected.includes(option.value)
      ? selected.filter((v) => v !== option.value)
      : [...selected, option.value];
    if (!selected.includes(option.value)) {
      setKnownLabels((prev) => ({ ...prev, [option.value]: option.label }));
    }
    if (next.length) setFilter(column, next);
    else clearFilter(column);
  };

  const optionsByValue = useMemo(() => {
    const map = new Map<string, FilterOption>();
    for (const option of options) map.set(option.value, option);
    return map;
  }, [options]);

  const selectedOptions = useMemo(
    () =>
      selected.map((value) => {
        const fromOptions = optionsByValue.get(value);
        if (fromOptions) return fromOptions;
        return {
          value,
          label: knownLabels[value] ?? value,
          searchText: value,
        } satisfies FilterOption;
      }),
    [selected, optionsByValue, knownLabels]
  );

  // Filter the option list with the deferred query so typing stays responsive
  // when there are thousands of members/orgs.
  const q = deferredQuery.trim().toLowerCase();
  const matchedOptions = useMemo(() => {
    const selectedSet = new Set(selected);
    const unselected = options.filter((option) => !selectedSet.has(option.value));
    if (!q) return unselected;
    return unselected.filter((option) => {
      const haystack = `${optionSearchText(option)} ${option.value}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [options, selected, q]);

  const visibleMatches = matchedOptions.slice(0, visibleCount);
  const hasMoreMatches = matchedOptions.length > visibleCount;
  const showBrowseEmpty = !q && options.length === 0 && selected.length === 0;

  return (
    <div className="border-border flex flex-col gap-2 border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-foreground flex-1 text-left">
          <Text size="sm" weight="medium">
            {label}
          </Text>
        </button>
        {selected.length > 0 && (
          <>
            <Text size="xs" textColor="muted">
              {selected.length}
            </Text>
            <button
              type="button"
              onClick={() => clearFilter(column)}
              className="text-muted-foreground hover:text-foreground text-xs transition-colors">
              {t`Clear`}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? t`Collapse` : t`Expand`}>
          <ChevronDown
            className={cn(
              'text-muted-foreground size-4 transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <ACTION_ICONS.search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={searchPlaceholder ?? t`Search…`}
              className="h-8 pl-7 text-sm"
            />
          </div>

          <div className="-mx-2 flex max-h-60 flex-col overflow-y-auto">
            {selectedOptions.map((option) => (
              <button
                key={`selected-${option.value}`}
                type="button"
                onClick={() => toggle(option)}
                aria-pressed
                className="hover:bg-card text-foreground flex items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-all">
                <Checkbox checked className="pointer-events-none shrink-0" />
                <FilterOptionRow option={option} counts={counts} />
              </button>
            ))}

            {!isSearching && showBrowseEmpty && (
              <div className="text-muted-foreground px-2 py-2 text-xs">
                {emptyHint ?? t`Type to search.`}
              </div>
            )}

            {isSearching && visibleMatches.length === 0 && selectedOptions.length === 0 && (
              <div className="text-muted-foreground px-2 py-2 text-xs">{t`Searching…`}</div>
            )}

            {!isSearching && q && visibleMatches.length === 0 && selectedOptions.length === 0 && (
              <div className="text-muted-foreground px-2 py-2 text-xs">{t`No matches.`}</div>
            )}

            {visibleMatches.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option)}
                aria-pressed={false}
                className="hover:bg-card hover:text-foreground text-muted-foreground flex items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-all">
                <Checkbox checked={false} className="pointer-events-none shrink-0" />
                <FilterOptionRow option={option} counts={counts} />
              </button>
            ))}
          </div>

          {hasMoreMatches && (
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + pageSize)}
              className="text-muted-foreground hover:text-foreground text-left text-xs transition-colors">
              {t`Show more`} ({matchedOptions.length - visibleCount})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** One collapsible filter group: a label + multi-select checkboxes wired to one column. */
export function CheckboxFilterGroup({
  column,
  label,
  options,
  counts,
  type = 'checkbox',
}: BaseFilterGroup & {
  options: FilterOption[];
  counts?: Record<string, number>;
  type?: FilterType;
}) {
  'use no memo';
  const { t } = useLingui();
  const { filters, setFilter, clearFilter } = useDataTableFilters();
  const [open, setOpen] = useState(true);

  const selected = (filters[column] as string[] | undefined) ?? [];

  // Nothing to show — most often a group whose options load asynchronously
  // (e.g. derived from a search response). Still keep it in the caller's
  // `filters` array from the start rather than adding it once loaded: datum-ui's
  // DataTable.Client registers each column's filter matcher once, on mount,
  // and never re-registers it, so a group added later would render checkboxes
  // that silently do nothing. Guard on `selected` too, so an already-applied
  // filter doesn't visually vanish if `options` empties out on a refetch.
  if (options.length === 0 && selected.length === 0) return null;

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    if (next.length) setFilter(column, next);
    else clearFilter(column);
  };

  return (
    <div className="border-border flex flex-col gap-2 border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-foreground flex-1 text-left">
          <Text size="sm" weight="medium">
            {label}
          </Text>
        </button>
        {selected.length > 0 && (
          <>
            <Text size="xs" textColor="muted">
              {selected.length}
            </Text>
            <button
              type="button"
              onClick={() => clearFilter(column)}
              className="text-muted-foreground hover:text-foreground text-xs transition-colors">
              {t`Clear`}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? t`Collapse` : t`Expand`}>
          <ChevronDown
            className={cn(
              'text-muted-foreground size-4 transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>
      </div>

      {open && type === 'dateRange' && (
        // dateRange buckets are cumulative ranges ("Last 7 days" ⊇ "Last 24
        // hours"), not independent categories — multi-selecting them ORs their
        // row sets together, so checking "Last 24 hours" while "Last 90 days"
        // is already checked still shows 90-day-old rows, which reads as "the
        // filter is broken." Render as radios so the UI itself communicates
        // single-select, rather than checkboxes that let you pick many.
        <RadioGroup
          value={selected[0] ?? ''}
          onValueChange={(value) => setFilter(column, [value])}
          className="-mx-2 flex max-h-60 flex-col gap-0 overflow-y-auto">
          {options.map((option) => (
            <Label
              key={option.value}
              className={cn(
                'hover:bg-card hover:text-foreground flex items-center gap-2 rounded-md px-2 py-1 text-sm font-normal transition-all',
                selected.includes(option.value) ? 'text-foreground' : 'text-muted-foreground'
              )}>
              <RadioGroupItem value={option.value} className="shrink-0" />
              <FilterOptionRow option={option} counts={counts} />
            </Label>
          ))}
        </RadioGroup>
      )}

      {open && type !== 'dateRange' && (
        <div className="-mx-2 flex max-h-60 flex-col overflow-y-auto">
          {options.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
                aria-pressed={checked}
                className={cn(
                  'hover:bg-card hover:text-foreground flex items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-all',
                  checked ? 'text-foreground' : 'text-muted-foreground'
                )}>
                <Checkbox checked={checked} className="pointer-events-none shrink-0" />
                <FilterOptionRow option={option} counts={counts} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Horizontal dropdown filters above the table (detail-tab style). Same config
 * and auto-wired matchers as the sidebar {@link FilterPanel} — only the
 * presentation differs (a row of popover dropdowns instead of a left rail).
 */
export function InlineFilterBar({
  filters,
  loading = false,
}: {
  filters: FilterGroupConfig[];
  loading?: boolean;
}) {
  'use no memo';
  const { t } = useLingui();
  const { filters: active, clearAllFilters } = useDataTableFilters();
  const activeCount = Object.values(active).filter(isActive).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ACTION_ICONS.filter className="text-muted-foreground size-4" />
      {loading
        ? filters.map((f) => (
            <Skeleton key={f.column} className="h-8 w-24 rounded-md" aria-hidden />
          ))
        : filters.map((f) => <InlineFilter key={f.column} {...f} />)}
      {!loading && activeCount > 0 && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="text-muted-foreground hover:text-foreground text-xs transition-colors">
          {t`Clear all`}
        </button>
      )}
    </div>
  );
}

/** One inline filter: a dropdown button (label + active count) over multi-select options. */
function InlineFilter(config: FilterGroupConfig) {
  'use no memo';
  const { column, label } = config;
  const { filters, setFilter, clearFilter } = useDataTableFilters();
  const selected = (filters[column] as string[] | undefined) ?? [];

  if (config.type === 'searchable') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors',
              selected.length > 0
                ? 'border-primary/40 bg-primary/5 text-foreground'
                : 'border-border text-muted-foreground hover:bg-muted'
            )}>
            <span>{label}</span>
            {selected.length > 0 && (
              <span className="bg-primary/15 text-primary flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-medium">
                {selected.length}
              </span>
            )}
            <ChevronDown className="text-muted-foreground size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-72 p-0 [&_[data-slot=filter-group-skeleton]]:border-0">
          {/* Reuse the sidebar searchable group; strip its outer border in the popover. */}
          <div className="[&>div]:border-0">
            <SearchableFilterGroup {...config} />
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  const { options } = config;

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    if (next.length) setFilter(column, next);
    else clearFilter(column);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors',
            selected.length > 0
              ? 'border-primary/40 bg-primary/5 text-foreground'
              : 'border-border text-muted-foreground hover:bg-muted'
          )}>
          <span>{label}</span>
          {selected.length > 0 && (
            <span className="bg-primary/15 text-primary flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-medium">
              {selected.length}
            </span>
          )}
          <ChevronDown className="text-muted-foreground size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        <div className="flex flex-col">
          {options.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
                aria-pressed={checked}
                className={cn(
                  'hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                  checked ? 'text-foreground' : 'text-muted-foreground'
                )}>
                <Checkbox checked={checked} className="pointer-events-none shrink-0" />
                <FilterOptionRow option={option} />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Mobile entry point for sidebar filters: a "Filters" button (with an active-dot)
 * that opens the same {@link FilterPanel} in a bottom Sheet — so the table keeps
 * full width on small screens. `<ListTable>` swaps to this below the `md` tier.
 */
export function MobileFilterButton({
  filters,
  loading = false,
}: {
  filters: FilterGroupConfig[];
  loading?: boolean;
}) {
  'use no memo';
  const { t } = useLingui();
  const { filters: active, clearAllFilters } = useDataTableFilters();
  const [open, setOpen] = useState(false);
  const activeCount = Object.values(active).filter(isActive).length;

  return (
    <>
      <Button
        htmlType="button"
        type="secondary"
        theme="outline"
        size="icon"
        aria-label={t`Filters`}
        className="relative size-8 shrink-0"
        disabled={loading}
        onClick={() => setOpen(true)}>
        <SlidersHorizontal className="size-4" />
        {!loading && activeCount > 0 && (
          <span className="bg-primary ring-card absolute top-1 right-1 size-2 rounded-full ring-2" />
        )}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="flex max-h-[85svh] flex-col gap-0 p-0">
          <VisuallyHidden>
            <SheetTitle>{t`Filters`}</SheetTitle>
            <SheetDescription>{t`Filter the list`}</SheetDescription>
          </VisuallyHidden>
          {/* Custom header (not FilterPanel's) with pr-12 so "Clear all" clears the Sheet's close X. */}
          <div className="border-border flex items-center justify-between border-b py-3 pr-12 pl-4">
            <div className="text-foreground flex items-center gap-2">
              <ACTION_ICONS.filter className="size-4" />
              <Text size="sm" weight="medium">{t`Filters`}</Text>
            </div>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground text-xs transition-colors">
                {t`Clear all`}
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading
              ? filters.map((f) => (
                  <FilterGroupSkeleton
                    key={f.column}
                    label={f.label}
                    optionCount={f.options.length}
                  />
                ))
              : filters.map((f) => <FilterGroup key={f.column} {...f} />)}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
