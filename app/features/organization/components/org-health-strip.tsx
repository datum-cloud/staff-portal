import { useOrgIssues } from '../hooks/use-org-issues';
import type { IssueArea } from '../lib/org-issues';
import {
  summarizeVerdict,
  tileStatus,
  type TileLine,
  type TileTone,
  type Verdict,
  type VerdictSummary,
} from '../lib/org-verdict';
import { DateTime } from '@/components/date';
import {
  StatStrip,
  StatStripItem,
  StatStripItems,
  StatStripLead,
  type StatStripTone,
} from '@/components/stat-strip';
import { StatTileDetail, StatTileHeadline, StatTileSkeleton } from '@/components/stat-tile';
import { STATUS_ICONS } from '@/utils/config/icons.config';
import { orgRoutes } from '@/utils/config/routes.config';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
import type { LucideIcon } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';

/** The strip's tiles, in order. Quota counts toward the verdict but has no tile. */
const TILE_AREAS = ['workloads', 'instances', 'loadBalancers', 'domains', 'dnsZones'] as const;
type TileArea = (typeof TILE_AREAS)[number];

const TONE_CLASS: Record<TileTone, string> = {
  danger: 'text-destructive',
  warning: 'text-warning',
  neutral: 'text-muted-foreground',
  success: 'text-success',
  muted: 'text-muted-foreground',
};

const VERDICT_STYLE: Record<Verdict, { icon: LucideIcon; text: string }> = {
  degraded: { icon: STATUS_ICONS.error, text: 'text-destructive' },
  warnings: { icon: STATUS_ICONS.warning, text: 'text-warning' },
  healthy: { icon: STATUS_ICONS.success, text: 'text-success' },
  checking: { icon: STATUS_ICONS.loading, text: 'text-muted-foreground' },
};

function areaLabel(area: TileArea | IssueArea): ReactNode {
  switch (area) {
    case 'workloads':
      return <Trans>Workloads</Trans>;
    case 'instances':
      return <Trans>Instances</Trans>;
    case 'loadBalancers':
      return <Trans>Load balancers</Trans>;
    case 'domains':
      return <Trans>Domains</Trans>;
    case 'dnsZones':
      return <Trans>DNS zones</Trans>;
    case 'quota':
      return <Trans>Quota</Trans>;
  }
}

function problemsLine(area: TileArea, count: number): ReactNode {
  switch (area) {
    case 'workloads':
      return <Plural value={count} one="# unhealthy" other="# unhealthy" />;
    case 'instances':
      return <Plural value={count} one="# failing" other="# failing" />;
    case 'loadBalancers':
    case 'dnsZones':
      return <Plural value={count} one="# not programmed" other="# not programmed" />;
    case 'domains':
      return <Plural value={count} one="# needs attention" other="# need attention" />;
  }
}

function clearLine(area: TileArea): ReactNode {
  switch (area) {
    case 'workloads':
      return <Trans>All ready</Trans>;
    case 'instances':
      return <Trans>All running</Trans>;
    case 'domains':
      return <Trans>All verified</Trans>;
    case 'loadBalancers':
    case 'dnsZones':
      return <Trans>All programmed</Trans>;
  }
}

function tileLine(area: TileArea, line: TileLine): ReactNode {
  switch (line.kind) {
    case 'problems':
      return problemsLine(area, line.count);
    case 'unread':
      return <Plural value={line.count} one="# project unread" other="# projects unread" />;
    case 'longPending':
      return <Plural value={line.count} one="# long-pending" other="# long-pending" />;
    case 'clear':
      return clearLine(area);
    case 'empty':
      return <Trans>None</Trans>;
    case 'loading':
    case 'error':
      return null;
  }
}

function VerdictHeading({ verdict }: { verdict: Verdict }) {
  switch (verdict) {
    case 'degraded':
      return <Trans>Degraded</Trans>;
    case 'warnings':
      return <Trans>Warnings</Trans>;
    case 'healthy':
      return <Trans>Healthy</Trans>;
    case 'checking':
      return <Trans>Checking…</Trans>;
  }
}

function UncheckedList({ summary }: { summary: VerdictSummary }) {
  const parts = summary.unchecked.map((area) => <span key={area}>{areaLabel(area)}</span>);
  return (
    <Trans>
      Couldn&apos;t check:{' '}
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && ', '}
          {part}
        </span>
      ))}
      {summary.unreadProjects.length > 0 && (
        <>
          {parts.length > 0 && ', '}
          <Plural
            value={summary.unreadProjects.length}
            one="# project unread"
            other="# projects unread"
          />
        </>
      )}
    </Trans>
  );
}

const VERDICT_TONE: Record<Verdict, StatStripTone> = {
  degraded: 'danger',
  warnings: 'warning',
  healthy: 'success',
  checking: 'neutral',
};

function VerdictLead({ summary, isLoading }: { summary: VerdictSummary; isLoading: boolean }) {
  const style = VERDICT_STYLE[summary.verdict];

  if (isLoading) {
    return (
      <StatStripLead>
        <Skeleton className="h-6 w-32 rounded" />
        <Skeleton className="h-4 w-48 rounded" />
        <Skeleton className="h-4 w-40 rounded" />
      </StatStripLead>
    );
  }

  const hasIssues = summary.issueCount > 0;

  return (
    <StatStripLead tone={VERDICT_TONE[summary.verdict]}>
      <div className={cn('flex items-center gap-2', style.text)}>
        <Icon
          icon={style.icon}
          size={18}
          aria-hidden
          className={summary.verdict === 'checking' ? 'animate-spin' : undefined}
        />
        <Text as="div" size="lg" weight="semibold" className={style.text}>
          <VerdictHeading verdict={summary.verdict} />
        </Text>
      </div>

      <Text size="sm" weight="medium">
        {hasIssues ? (
          <>
            <Plural value={summary.issueCount} one="# issue" other="# issues" />
            {summary.projectCount > 0 && (
              <>
                {' '}
                <Plural value={summary.projectCount} one="in # project" other="in # projects" />
              </>
            )}
          </>
        ) : summary.verdict === 'checking' ? (
          <Trans>Checking every project…</Trans>
        ) : (
          <Trans>Nothing needs attention</Trans>
        )}
        {summary.lowCount > 0 && (
          <>
            {' · '}
            <Plural value={summary.lowCount} one="# long-pending" other="# long-pending" />
          </>
        )}
      </Text>

      <Text size="xs" textColor="muted">
        {summary.unchecked.length > 0 || summary.unreadProjects.length > 0 ? (
          <UncheckedList summary={summary} />
        ) : summary.oldest && summary.newest ? (
          <Trans>
            Oldest <DateTime date={summary.oldest} variant="relative" /> · newest{' '}
            <DateTime date={summary.newest} variant="relative" />
          </Trans>
        ) : null}
      </Text>
    </StatStripLead>
  );
}

const tileHref = (area: TileArea, orgName: string): string => {
  switch (area) {
    case 'workloads':
    case 'instances':
      // No organization-wide compute list; compute lives in each project.
      return orgRoutes.project(orgName);
    case 'loadBalancers':
      return orgRoutes.edge(orgName);
    case 'domains':
      return orgRoutes.domain(orgName);
    case 'dnsZones':
      return orgRoutes.dns(orgName);
  }
};

/**
 * The organization overview's health strip (#767): a verdict, then one tile per
 * resource area. Compute tiles only show with the compute plugin installed;
 * each tile loads, and fails, on its own.
 */
export function OrgHealthStrip({ orgName, className }: { orgName: string; className?: string }) {
  const { t } = useLingui();
  const { issues, areas, isLoading } = useOrgIssues(orgName);
  const summary = useMemo(() => summarizeVerdict(issues, areas), [issues, areas]);
  const tiles = TILE_AREAS.filter((area) => areas[area].enabled);

  return (
    <StatStrip label={t`Organization health`} className={className}>
      <VerdictLead summary={summary} isLoading={isLoading} />
      <StatStripItems>
        {tiles.map((area) => {
          const state = areas[area];
          const status = tileStatus(area, issues, state);
          return (
            <StatStripItem key={area} title={areaLabel(area)} href={tileHref(area, orgName)}>
              {status.line.kind === 'loading' ? (
                <StatTileSkeleton />
              ) : (
                <>
                  <StatTileHeadline>
                    {status.line.kind === 'error' ? '—' : state.total}
                  </StatTileHeadline>
                  <StatTileDetail
                    className={cn('flex items-center gap-1.5', TONE_CLASS[status.tone])}>
                    <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
                    {status.line.kind === 'error' ? (
                      <Trans>Couldn&apos;t load</Trans>
                    ) : (
                      tileLine(area, status.line)
                    )}
                  </StatTileDetail>
                </>
              )}
            </StatStripItem>
          );
        })}
      </StatStripItems>
    </StatStrip>
  );
}
