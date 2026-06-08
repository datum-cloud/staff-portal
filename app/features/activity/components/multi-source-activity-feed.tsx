/**
 * MultiSourceActivityFeed
 *
 * Renders a merged activity timeline sourced from the org control plane **plus**
 * any project control planes the user has selected via the Projects filter.
 *
 * ## Hooks pattern chosen: fixed-slot array (useMaybeActivityFeed)
 * React's Rules of Hooks forbid calling hooks inside loops or conditionals, so
 * we cannot dynamically call `useActivityFeed` once per selected project.  Two
 * idiomatic solutions exist:
 *   A. Fixed-slot array — always call exactly MAX_PROJECTS hooks; pass a real
 *      `ActivityApiClient` for active slots and `null` for empty slots; a
 *      `useMaybeActivityFeed` shim returns an inert empty result when the client
 *      is null.
 *   B. Sibling sub-components — render one child component per source; each
 *      child owns its own `useActivityFeed` call and lifts state up via a
 *      callback/context.
 *
 * We chose **A (fixed-slot)** because:
 * - It keeps all state in one component, making the merge/sort/pagination
 *   logic easy to follow without cross-component callback bookkeeping.
 * - The 10-project cap makes the slot count small and bounded.
 * - `useMaybeActivityFeed` is a 10-line shim, not a new abstraction.
 *
 * ## Streaming
 * Streaming is disabled in this view because merging concurrent watch streams
 * from N sources introduces ordering races. Even in the zero-projects case we
 * use the same composed view (`ActivityFeedFilters` + merged table) so the UI
 * stays consistent.
 *
 * ## Pagination
 * A single "Load more" button calls `loadMore()` on **every source that still
 * has `hasMore=true``.  Results are re-sorted after each round-trip.
 * Known limitation: a high-volume project can push older org events below the
 * visible window (per-source quota or per-source manual pagination is the v2
 * mitigation — not implemented here).
 */
import { ProjectsFilter } from './ProjectsFilter';
import {
  createActivityClientConfig,
  getOrganizationControlPlanePath,
  getProjectControlPlanePath,
} from '@/features/activity/lib/activity-client';
import {
  ACTIVITY_FILTER_URL_KEYS,
  parseActivityFilters,
  parseTimeRange,
  serializeActivityFilters,
  parseProjectsFilter,
  serializeProjectsFilter,
} from '@/features/activity/lib/activity-filters';
import { staffResourceLinkResolver } from '@/features/activity/lib/activity-link-resolvers';
import { useOrgProjectListQuery } from '@/resources/request/client';
import {
  ActivityApiClient,
  ActivityFeedFilters as ActivityFeedFiltersBar,
  ActivityFeedItem,
  ActivityFeedItemSkeleton,
  ApiErrorAlert,
  useActivityFeed,
  type UseActivityFeedOptions,
  type UseActivityFeedResult,
  type ActivityFeedFilterState as ActivityFeedFilters,
  type TimeRange,
  type Activity,
  type ResourceLinkResolver,
  type TenantRenderer,
} from '@datum-cloud/activity-ui';
import { TooltipProvider } from '@datum-cloud/activity-ui';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card } from '@datum-cloud/datum-ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { ComMiloapisResourcemanagerV1Alpha1Project } from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';

/** Maximum number of project sources (enforced in URL parse + dropdown UI). */
const MAX_PROJECTS = 10;

/**
 * Module-level singleton used as the `client` for empty hook slots. It never
 * receives a refresh() call in our code, so it makes no network requests — but
 * `useActivityFeed` requires a non-null client. Sharing one instance across all
 * empty slots avoids constructing 10 throwaway clients per `MultiSourceView`.
 */
const NOOP_ACTIVITY_CLIENT = new ActivityApiClient(createActivityClientConfig());

/**
 * A hook shim that delegates to `useActivityFeed` when a client is provided,
 * or returns an inert empty result when `client` is null.  This allows us to
 * always call exactly the same number of hooks per render regardless of how
 * many projects are selected.
 */
function useMaybeActivityFeed(
  client: ActivityApiClient | null,
  options: Omit<UseActivityFeedOptions, 'client'>
): UseActivityFeedResult {
  const result = useActivityFeed({
    client: client ?? NOOP_ACTIVITY_CLIENT,
    ...options,
  });

  // When the slot has no client, return an inert empty result so this slot
  // contributes nothing to the merged view.
  return client === null
    ? {
        activities: [],
        isLoading: false,
        error: null,
        watchError: null,
        hasMore: false,
        filters: options.initialFilters ?? {},
        timeRange: options.initialTimeRange ?? { start: 'now-7d' },
        refresh: async () => {},
        loadMore: async () => {},
        setFilters: () => {},
        setTimeRange: () => {},
        reset: () => {},
        isStreaming: false,
        startStreaming: () => {},
        stopStreaming: () => {},
        newActivitiesCount: 0,
        effectiveTimeRange: undefined,
      }
    : result;
}

export interface MultiSourceActivityFeedProps {
  /** Organization metadata.name (used to scope the org client + project list) */
  orgName: string;
  /** Function that resolves resource references to navigable URLs */
  resourceLinkResolver?: ResourceLinkResolver;
  /** Custom renderer for tenant badges */
  tenantRenderer?: TenantRenderer;
  /** Items per page per source (default: 50) */
  pageSize?: number;
  /** Additional CSS class on the outer Card */
  className?: string;
}

/**
 * MultiSourceActivityFeed merges activity from the org control plane with
 * activity from any selected project control planes.  When no projects are
 * selected it delegates to the standard single-source `<ActivityFeed>` so the
 * existing behaviour (including streaming if enabled) is preserved unchanged.
 */
export function MultiSourceActivityFeed({
  orgName,
  resourceLinkResolver = staffResourceLinkResolver,
  tenantRenderer,
  pageSize = 50,
  className,
}: MultiSourceActivityFeedProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse URL state ─────────────────────────────────────────────────────────
  const initialFilters = useMemo(
    () => parseActivityFilters(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const initialTimeRange = useMemo(
    () => parseTimeRange(searchParams) ?? { start: 'now-7d' },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const selectedProjects = useMemo(
    () => parseProjectsFilter(searchParams, MAX_PROJECTS),
    [searchParams]
  );

  // Project list ─────────────────────────────────────────────────────────────
  const projectListQuery = useOrgProjectListQuery(orgName);
  const projectItems = useMemo(
    () => projectListQuery.data?.items ?? [],
    [projectListQuery.data?.items]
  );

  // Auto-select the first project on initial load when the org has at least
  // one and the URL has no projects yet. Fires at most once per mount —
  // subsequent user clears are respected.
  const hasAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (hasAutoSelectedRef.current) return;
    if (projectListQuery.isLoading) return;
    hasAutoSelectedRef.current = true;
    if (selectedProjects.length > 0) return;
    const firstName = projectItems[0]?.metadata?.name;
    if (!firstName) return;
    const serialized = serializeProjectsFilter([firstName]);
    if (!serialized) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('projects', serialized);
        return next;
      },
      { replace: true }
    );
  }, [projectListQuery.isLoading, projectItems, selectedProjects, setSearchParams]);

  // Stale URL safety: after the project list loads, drop any selected names
  // that no longer exist and rewrite the URL to avoid spurious fan-outs.
  // This is one-shot per mount — once we've rewritten, subsequent project
  // deletions during the session aren't auto-cleaned. The trade-off keeps
  // the effect simple and avoids fighting the user when they intentionally
  // pin a deleted name (e.g. for a permalink). A full page reload will
  // re-run the cleanup.
  const hasRewrittenRef = useRef(false);
  useEffect(() => {
    if (projectListQuery.isLoading || hasRewrittenRef.current) return;
    if (selectedProjects.length === 0) return;

    const validNames = new Set(projectItems.map((p) => p.metadata?.name).filter(Boolean));
    const valid = selectedProjects.filter((n) => validNames.has(n));

    if (valid.length !== selectedProjects.length) {
      hasRewrittenRef.current = true;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const serialized = serializeProjectsFilter(valid);
          if (serialized) {
            next.set('projects', serialized);
          } else {
            next.delete('projects');
          }
          return next;
        },
        { replace: true }
      );
    }
  }, [projectListQuery.isLoading, projectItems, selectedProjects, setSearchParams]);

  // Org client ───────────────────────────────────────────────────────────────
  const orgClient = useMemo(
    () =>
      new ActivityApiClient(createActivityClientConfig(getOrganizationControlPlanePath(orgName))),
    [orgName]
  );

  // Stable comma-joined key used as the single dep for the projectClients memo
  // so that we don't need a method call in the dep array (ESLint rule).
  const selectedProjectsKey = selectedProjects.join(',');

  // Project clients — one memo per fixed slot ────────────────────────────────
  // We create exactly MAX_PROJECTS client slots.  Slots with no selected project
  // hold null; slots with a project name hold a memoized ActivityApiClient.
  // The clients are stable across renders unless the project name in that slot
  // changes (which only happens when the user selects/deselects projects).
  const projectClients = useMemo((): Array<ActivityApiClient | null> => {
    return Array.from({ length: MAX_PROJECTS }, (_, i) => {
      const name = selectedProjects[i];
      if (!name) return null;
      return new ActivityApiClient(createActivityClientConfig(getProjectControlPlanePath(name)));
    });
    // selectedProjectsKey is a stable string derived from selectedProjects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectsKey]);

  return (
    <MultiSourceView
      orgClient={orgClient}
      projectClients={projectClients}
      selectedProjects={selectedProjects}
      projectItems={projectItems}
      projectListLoading={projectListQuery.isLoading}
      resourceLinkResolver={resourceLinkResolver}
      tenantRenderer={tenantRenderer}
      pageSize={pageSize}
      initialFilters={initialFilters}
      initialTimeRange={initialTimeRange}
      className={className}
      onProjectsChange={handleProjectsChange}
      onFiltersChange={handleFiltersChange}
    />
  );

  function handleProjectsChange(next: string[]) {
    setSearchParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev);
        const serialized = serializeProjectsFilter(next);
        if (serialized) {
          nextParams.set('projects', serialized);
        } else {
          nextParams.delete('projects');
        }
        return nextParams;
      },
      { replace: false }
    );
  }

  function handleFiltersChange(filters: ActivityFeedFilters, timeRange: TimeRange) {
    const serialized = serializeActivityFilters(filters, timeRange, false);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        // Preserve the projects param, overwrite the filter keys
        serialized.forEach((value, key) => {
          next.set(key, value);
        });
        // Remove keys no longer present in serialized output (cleared filters)
        ACTIVITY_FILTER_URL_KEYS.forEach((key) => {
          if (!serialized.has(key)) next.delete(key);
        });
        return next;
      },
      { replace: false }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MultiSourceView — rendered when at least one project is selected
// ─────────────────────────────────────────────────────────────────────────────

interface MultiSourceViewProps {
  orgClient: ActivityApiClient;
  projectClients: Array<ActivityApiClient | null>;
  selectedProjects: string[];
  projectItems: ComMiloapisResourcemanagerV1Alpha1Project[];
  projectListLoading: boolean;
  resourceLinkResolver?: ResourceLinkResolver;
  tenantRenderer?: TenantRenderer;
  pageSize: number;
  initialFilters: Partial<ActivityFeedFilters>;
  initialTimeRange: TimeRange;
  className?: string;
  onProjectsChange: (next: string[]) => void;
  onFiltersChange: (filters: ActivityFeedFilters, timeRange: TimeRange) => void;
}

const FEED_OPTIONS_BASE: Omit<UseActivityFeedOptions, 'client'> = {
  enableStreaming: false,
  initialTimeRange: { start: 'now-7d' },
};

/**
 * Inner component that holds exactly MAX_PROJECTS + 1 hook calls.
 * Extracted so the hook-call count is constant even when the parent toggles
 * between single-source and multi-source render paths.
 */
function MultiSourceView({
  orgClient,
  projectClients,
  selectedProjects,
  projectItems,
  projectListLoading,
  resourceLinkResolver,
  tenantRenderer,
  pageSize,
  initialFilters,
  initialTimeRange,
  className,
  onProjectsChange,
  onFiltersChange,
}: MultiSourceViewProps) {
  const feedOptions: Omit<UseActivityFeedOptions, 'client'> = useMemo(
    () => ({
      ...FEED_OPTIONS_BASE,
      initialFilters,
      initialTimeRange,
      pageSize,
      enableStreaming: false,
    }),
    // Stable reference — only needs to change when the user alters URL params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Org source — always active. Drives the filter row (its filters/timeRange
  // state is the source of truth; setFilters/setTimeRange is fanned out to all
  // active project sources via an effect below).
  const orgFeed = useActivityFeed({ client: orgClient, ...feedOptions });

  // Fixed project slots — always called, inert when client is null
  const slot0 = useMaybeActivityFeed(projectClients[0], feedOptions);
  const slot1 = useMaybeActivityFeed(projectClients[1], feedOptions);
  const slot2 = useMaybeActivityFeed(projectClients[2], feedOptions);
  const slot3 = useMaybeActivityFeed(projectClients[3], feedOptions);
  const slot4 = useMaybeActivityFeed(projectClients[4], feedOptions);
  const slot5 = useMaybeActivityFeed(projectClients[5], feedOptions);
  const slot6 = useMaybeActivityFeed(projectClients[6], feedOptions);
  const slot7 = useMaybeActivityFeed(projectClients[7], feedOptions);
  const slot8 = useMaybeActivityFeed(projectClients[8], feedOptions);
  const slot9 = useMaybeActivityFeed(projectClients[9], feedOptions);

  const projectSlots = [slot0, slot1, slot2, slot3, slot4, slot5, slot6, slot7, slot8, slot9];

  // Auto-load on mount + whenever a project slot's client changes (user added
  // a project via the Projects filter, or swapped one for another in the same
  // slot). We track the previous client per slot so a no-op rerender doesn't
  // re-fetch, but a null→client / clientA→clientB transition does.
  const hasMountedRef = useRef(false);
  const prevProjectClientsRef = useRef<Array<ActivityApiClient | null>>(
    Array.from({ length: MAX_PROJECTS }, () => null)
  );
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      orgFeed.refresh();
    }
    projectClients.forEach((client, i) => {
      const prev = prevProjectClientsRef.current[i];
      if (client !== null && client !== prev) {
        projectSlots[i].refresh();
      }
    });
    prevProjectClientsRef.current = projectClients;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectClients]);

  // Wrap setFilters/setTimeRange so a user-initiated change in the filter bar
  // (a) updates the org source, (b) fans the same value out to all active
  // project sources, and (c) writes the URL once. Doing this in the setter
  // (not an effect) avoids the render-loop that occurs when `orgFeed.filters`
  // is a fresh object reference on every render.
  const handleFiltersChangeInternal = useCallback(
    (next: ActivityFeedFilters) => {
      orgFeed.setFilters(next);
      projectSlots.forEach((slot, i) => {
        if (projectClients[i] !== null) slot.setFilters(next);
      });
      onFiltersChange(next, orgFeed.timeRange);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      orgFeed.setFilters,
      orgFeed.timeRange,
      slot0,
      slot1,
      slot2,
      slot3,
      slot4,
      slot5,
      slot6,
      slot7,
      slot8,
      slot9,
      projectClients,
      onFiltersChange,
    ]
  );

  const handleTimeRangeChangeInternal = useCallback(
    (next: TimeRange) => {
      orgFeed.setTimeRange(next);
      projectSlots.forEach((slot, i) => {
        if (projectClients[i] !== null) slot.setTimeRange(next);
      });
      onFiltersChange(orgFeed.filters, next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      orgFeed.setTimeRange,
      orgFeed.filters,
      slot0,
      slot1,
      slot2,
      slot3,
      slot4,
      slot5,
      slot6,
      slot7,
      slot8,
      slot9,
      projectClients,
      onFiltersChange,
    ]
  );

  // Active slots = org + project slots that have a corresponding client.
  // We list every slot individually in the dep array to avoid spread (ESLint rule).
  const activeSources: UseActivityFeedResult[] = useMemo(
    () => [orgFeed, ...projectSlots.filter((_, i) => projectClients[i] !== null)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgFeed, slot0, slot1, slot2, slot3, slot4, slot5, slot6, slot7, slot8, slot9]
  );

  // Merged + deduped activities, sorted newest-first
  const mergedActivities = useMemo<Activity[]>(() => {
    const all = activeSources.flatMap((s) => s.activities);
    // Dedup by uid (fallback to name)
    const seen = new Set<string>();
    const deduped = all.filter((a) => {
      const key = a.metadata?.uid ?? a.metadata?.name;
      if (!key) return true; // keep items without a stable key
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Sort newest-first by creationTimestamp
    return deduped.sort((a, b) => {
      const ta = a.metadata?.creationTimestamp;
      const tb = b.metadata?.creationTimestamp;
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return tb.localeCompare(ta);
    });
  }, [activeSources]);

  const isLoading = activeSources.some((s) => s.isLoading);
  const hasMore = activeSources.some((s) => s.hasMore);
  const errors = activeSources.map((s) => s.error).filter((e): e is Error => e !== null);

  const handleLoadMore = useCallback(() => {
    activeSources.forEach((s) => {
      if (s.hasMore) s.loadMore();
    });
  }, [activeSources]);

  // Source labels for error alerts: [org, ...projects]
  const sourceLabels = useMemo(() => {
    const labels: string[] = ['org'];
    selectedProjects.forEach((name, i) => {
      if (projectClients[i] !== null) labels.push(name);
    });
    return labels;
  }, [selectedProjects, projectClients]);

  return (
    // Activity-ui's lower-level building blocks (ActivityFeedItem,
    // ActivityFeedFiltersBar) use Radix's primitive Tooltip composition
    // which requires a TooltipProvider ancestor. The high-level
    // <ActivityFeed> wraps its own; when we compose the pieces ourselves
    // we have to provide one too. Drop this once we mount a global
    // TooltipProvider in root.tsx.
    <TooltipProvider delayDuration={200}>
      {/* Single Card wrapping filters + list + load more — mirrors the
          activity-ui ActivityFeed chrome so the global and per-resource
          feeds look identical. */}
      <Card className={cn('flex flex-1 flex-col gap-3 overflow-hidden p-3 shadow-none', className)}>
        <ActivityFeedFiltersBar
          client={orgClient}
          filters={orgFeed.filters}
          timeRange={orgFeed.timeRange}
          onFiltersChange={handleFiltersChangeInternal}
          onTimeRangeChange={handleTimeRangeChangeInternal}
          extraFilters={
            <ProjectsFilter
              projects={projectItems}
              selected={selectedProjects}
              onChange={onProjectsChange}
              loading={projectListLoading}
              maxSelection={MAX_PROJECTS}
            />
          }
        />

        {errors.map((err, i) => (
          <ApiErrorAlert
            key={sourceLabels[i] ?? i}
            error={err}
            onRetry={() => activeSources[i]?.refresh()}
          />
        ))}

        <div className="flex-1 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="w-10">Actor</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead className="whitespace-nowrap">Tenant</TableHead>
                <TableHead className="whitespace-nowrap">When</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && mergedActivities.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <ActivityFeedItemSkeleton key={i} isLast={i === 7} />
                ))
              ) : mergedActivities.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground py-10 text-center text-sm">
                    No activity found for the selected sources.
                  </TableCell>
                </TableRow>
              ) : (
                mergedActivities.map((activity) => (
                  <ActivityFeedItem
                    key={activity.metadata?.uid ?? activity.metadata?.name}
                    activity={activity}
                    resourceLinkResolver={resourceLinkResolver}
                    tenantRenderer={tenantRenderer}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {hasMore && (
          <div className="flex justify-center pt-1">
            <Button
              type="secondary"
              theme="outline"
              size="small"
              onClick={handleLoadMore}
              disabled={isLoading}>
              {isLoading ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        )}
      </Card>
    </TooltipProvider>
  );
}
