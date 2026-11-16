import { NEEDS_ATTENTION_ID, useAttentionTab } from '../hooks/use-attention-tab';
import { useOrgComputeStatus } from '../hooks/use-org-compute-status';
import { useOrgIssues } from '../hooks/use-org-issues';
import type { InstanceStatus } from '../lib/compute-status';
import {
  ATTENTION_TABS,
  buildAttentionRows,
  checkedTotals,
  rowsForTab,
  tabCounts,
  type AttentionRow,
  type AttentionTab,
} from '../lib/needs-attention';
import type { IssueArea, IssueSeverity, OrgIssue } from '../lib/org-issues';
import { DateTime } from '@/components/date';
import { SectionCard } from '@/features/milo';
import { ENTITY_ICONS, STATUS_ICONS, TAB_ICONS } from '@/utils/config/icons.config';
import { projectRoutes } from '@/utils/config/routes.config';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { Tabs, TabsList, TabsTrigger } from '@datum-cloud/datum-ui/tabs';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Plural, Trans } from '@lingui/react/macro';
import { ArrowRight, ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';

const AREA_ICON: Record<IssueArea, LucideIcon> = {
  workloads: ENTITY_ICONS.workload,
  instances: ENTITY_ICONS.instance,
  loadBalancers: ENTITY_ICONS.edge,
  domains: ENTITY_ICONS.domain,
  dnsZones: ENTITY_ICONS.dns,
  quota: TAB_ICONS.quotas,
};

const SEVERITY_STYLE: Record<IssueSeverity, { box: string; text: string }> = {
  danger: { box: 'bg-destructive/10', text: 'text-destructive' },
  warning: { box: 'bg-warning/10', text: 'text-warning' },
  low: { box: 'bg-muted', text: 'text-muted-foreground' },
};

function kindLabel(area: IssueArea): ReactNode {
  switch (area) {
    case 'workloads':
      return <Trans>Workload</Trans>;
    case 'instances':
      return <Trans>Instance</Trans>;
    case 'loadBalancers':
      return <Trans>Load balancer</Trans>;
    case 'domains':
      return <Trans>Domain</Trans>;
    case 'dnsZones':
      return <Trans>DNS zone</Trans>;
    case 'quota':
      return <Trans>Quota</Trans>;
  }
}

function tabLabel(tab: AttentionTab): ReactNode {
  switch (tab) {
    case 'all':
      return <Trans>All</Trans>;
    case 'compute':
      return <Trans>Compute</Trans>;
    case 'network':
      return <Trans>Network</Trans>;
    case 'quota':
      return <Trans>Quota</Trans>;
  }
}

function checkedLabel(area: IssueArea, total: number): ReactNode {
  switch (area) {
    case 'workloads':
      return <Plural value={total} one="# workload" other="# workloads" />;
    case 'instances':
      return <Plural value={total} one="# instance" other="# instances" />;
    case 'loadBalancers':
      return <Plural value={total} one="# load balancer" other="# load balancers" />;
    case 'domains':
      return <Plural value={total} one="# domain" other="# domains" />;
    case 'dnsZones':
      return <Plural value={total} one="# DNS zone" other="# DNS zones" />;
    case 'quota':
      return <Plural value={total} one="# quota bucket" other="# quota buckets" />;
  }
}

function ReasonPill({ tone, children }: { tone: IssueSeverity; children: ReactNode }) {
  return (
    <Text
      as="span"
      size="xs"
      weight="medium"
      className={cn(
        'shrink-0 rounded px-1.5 py-0.5 font-mono',
        SEVERITY_STYLE[tone].box,
        SEVERITY_STYLE[tone].text
      )}>
      {children}
    </Text>
  );
}

function IssueAge({ issue }: { issue: OrgIssue }) {
  const date = issue.expiresAt ?? issue.since;
  if (!date) return null;
  return <DateTime date={date} variant="relative" />;
}

function InstancesTable({
  instances,
  failing,
}: {
  instances: InstanceStatus[];
  failing: ReadonlySet<string>;
}) {
  if (instances.length === 0) {
    return (
      <Text size="sm" textColor="muted">
        <Trans>No instances.</Trans>
      </Text>
    );
  }
  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Trans>Instance</Trans>
            </TableHead>
            <TableHead>
              <Trans>Location</Trans>
            </TableHead>
            <TableHead>
              <Trans>Status</Trans>
            </TableHead>
            <TableHead>
              <Trans>Last event</Trans>
            </TableHead>
            <TableHead>
              <Trans>Age</Trans>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {instances.map((instance) => {
            const tone: IssueSeverity = failing.has(instance.name)
              ? 'danger'
              : instance.readiness === 'Ready'
                ? 'low'
                : 'warning';
            return (
              <TableRow key={`${instance.namespace}/${instance.name}`}>
                <TableCell className="font-mono">
                  {instance.href ? <Link to={instance.href}>{instance.name}</Link> : instance.name}
                </TableCell>
                <TableCell>{instance.location ?? '—'}</TableCell>
                <TableCell>
                  {instance.readiness === 'Ready' ? (
                    <Text as="span" size="xs" className="text-success">
                      <Trans>Ready</Trans>
                    </Text>
                  ) : (
                    <ReasonPill tone={tone}>{instance.reason ?? instance.readiness}</ReasonPill>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">
                  {instance.message ?? '—'}
                </TableCell>
                <TableCell>
                  {instance.createdAt ? (
                    <DateTime date={instance.createdAt} variant="relative" />
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function RowLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-primary inline-flex items-center gap-1 hover:underline">
      <Text as="span" size="xs" weight="medium" className="text-primary">
        {children}
      </Text>
      <Icon icon={ArrowRight} size={12} aria-hidden />
    </Link>
  );
}

function AttentionRowItem({
  row,
  instancesOf,
}: {
  row: AttentionRow;
  instancesOf: (project: string, workload: string) => InstanceStatus[];
}) {
  const [open, setOpen] = useState(false);
  const { issue } = row;
  const style = SEVERITY_STYLE[issue.severity];
  const isWorkload = issue.area === 'workloads';

  return (
    <li className={cn(issue.severity === 'low' && 'opacity-60')}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="hover:bg-muted/30 flex w-full items-start gap-3 rounded-md px-2 py-3 text-left transition-colors">
        <Icon
          icon={open ? ChevronDown : ChevronRight}
          size={16}
          aria-hidden
          className="text-muted-foreground mt-1.5 shrink-0"
        />
        <span
          className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', style.box)}>
          <Icon icon={AREA_ICON[issue.area]} size={14} aria-hidden className={style.text} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <Text as="span" size="sm" weight="medium" className="truncate">
              {issue.name}
            </Text>
            <ReasonPill tone={issue.severity}>{issue.reason}</ReasonPill>
          </span>
          <Text as="span" size="xs" textColor="muted" className="truncate">
            {issue.project ?? <Trans>Organization</Trans>} › {kindLabel(issue.area)} › {issue.name}
          </Text>
          {issue.message && (
            <Text
              as="span"
              size="xs"
              textColor="muted"
              className={cn('font-mono', !open && 'truncate')}>
              {issue.message}
            </Text>
          )}
        </span>
        <Text as="span" size="xs" textColor="muted" className="mt-0.5 shrink-0">
          <IssueAge issue={issue} />
        </Text>
      </button>

      {open && (
        <div className="flex flex-col gap-3 pb-4 pl-[3.75rem]">
          {isWorkload && issue.project && (
            <InstancesTable
              instances={instancesOf(issue.project, issue.name)}
              failing={new Set(row.instances.map((instance) => instance.name))}
            />
          )}
          <div className="flex flex-wrap gap-4">
            {issue.project && (isWorkload || issue.area === 'instances') && (
              <RowLink to={projectRoutes.activity.events(issue.project)}>
                <Trans>Events</Trans>
              </RowLink>
            )}
            {issue.href && (
              <RowLink to={issue.href}>
                {isWorkload ? <Trans>Workload detail</Trans> : <Trans>Open</Trans>}
              </RowLink>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * The organization overview's "Needs attention" list (#768): every issue from
 * `useOrgIssues`, with failing instances nested under their workload, filtered
 * by tab. The tab lives in the URL so the health strip's tiles can open it.
 */
export function OrgNeedsAttention({ orgName, className }: { orgName: string; className?: string }) {
  const { issues, areas, checkedAt, isLoading } = useOrgIssues(orgName);
  const compute = useOrgComputeStatus(orgName);
  const { tab, setTab } = useAttentionTab();

  const rows = useMemo(() => buildAttentionRows(issues), [issues]);
  const counts = useMemo(() => tabCounts(rows), [rows]);
  const computeOn = areas.workloads.enabled;
  const tabs = ATTENTION_TABS.filter((t) => t !== 'compute' || computeOn);
  const activeTab: AttentionTab = tabs.includes(tab) ? tab : 'all';
  const visible = rowsForTab(rows, activeTab);
  const loading = isLoading || Object.values(areas).some((area) => area.enabled && area.isLoading);

  const instancesOf = (project: string, workload: string) =>
    (compute.projects.get(project)?.compute?.instances ?? []).filter(
      (instance) => instance.workloadName === workload
    );

  return (
    <section id={NEEDS_ATTENTION_ID} className={cn('scroll-mt-4', className)}>
      <SectionCard
        title={<Trans>Needs attention</Trans>}
        action={
          checkedAt ? (
            <Text size="xs" textColor="muted">
              <Trans>
                Checked <DateTime date={new Date(checkedAt).toISOString()} variant="relative" />
              </Trans>
            </Text>
          ) : null
        }>
        <div className="flex flex-col gap-2">
          <Tabs value={activeTab} onValueChange={(value) => setTab(value as AttentionTab)}>
            <TabsList variant="line">
              {tabs.map((t) => (
                <TabsTrigger key={t} value={t} className="gap-1.5">
                  {tabLabel(t)}
                  <Text as="span" size="xs" textColor="muted">
                    {counts[t]}
                  </Text>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {visible.length > 0 ? (
            <ul className="divide-y">
              {visible.map((row) => (
                <AttentionRowItem key={row.issue.id} row={row} instancesOf={instancesOf} />
              ))}
            </ul>
          ) : loading ? (
            <div className="flex flex-col gap-3 py-2" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Icon icon={STATUS_ICONS.success} size={24} aria-hidden className="text-success" />
              <Text weight="semibold">
                <Trans>Nothing needs attention</Trans>
              </Text>
              <Text size="sm" textColor="muted">
                <Trans>Checked</Trans>{' '}
                {checkedTotals(areas).map(({ area, total }, index, all) => (
                  <span key={area}>
                    {index > 0 && (index === all.length - 1 ? <Trans> and </Trans> : ', ')}
                    {checkedLabel(area, total)}
                  </span>
                ))}
                .
              </Text>
            </div>
          ) : (
            <Text size="sm" textColor="muted" className="py-6 text-center">
              <Trans>Nothing needs attention here.</Trans>
            </Text>
          )}
        </div>
      </SectionCard>
    </section>
  );
}
