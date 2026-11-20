import { useOrgProjectHealth } from '../hooks/use-org-project-health';
import type { ProjectHealthRow } from '../lib/project-health';
import { OverviewEmptyState } from './overview-card';
import { SectionCard } from '@/features/milo';
import { useShowMore } from '@/hooks';
import { ENTITY_ICONS, STATUS_ICONS } from '@/utils/config/icons.config';
import { projectRoutes } from '@/utils/config/routes.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Plural, Trans } from '@lingui/react/macro';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** Projects shown before "Show all". */
const VISIBLE_PROJECTS = 8;

/** Common HTTP statuses, so an unread project says why ("403 Forbidden"). */
const STATUS_TEXT: Readonly<Record<number, string>> = {
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

function dotClass(row: ProjectHealthRow): string {
  switch (row.status) {
    case 'issues':
      return row.severity === 'danger' ? 'bg-destructive' : 'bg-warning';
    case 'healthy':
      return 'bg-success';
    case 'unread':
      return 'bg-muted-foreground';
    case 'loading':
      return 'bg-muted-foreground/40';
  }
}

/** "3 workloads · 8 instances · 2 ALBs", leaving out anything that's zero or didn't load. */
function ResourceSummary({ row }: { row: ProjectHealthRow }) {
  const { workloads, instances, loadBalancers } = row.resources;
  const parts: ReactNode[] = [
    workloads ? <Plural key="w" value={workloads} one="# workload" other="# workloads" /> : null,
    instances ? <Plural key="i" value={instances} one="# instance" other="# instances" /> : null,
    loadBalancers ? <Plural key="l" value={loadBalancers} one="# ALB" other="# ALBs" /> : null,
  ].filter(Boolean);

  if (parts.length === 0) return <Trans>No resources</Trans>;
  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && ' · '}
          {part}
        </span>
      ))}
    </>
  );
}

function StatusLabel({ row }: { row: ProjectHealthRow }) {
  switch (row.status) {
    case 'issues':
      return (
        <Text
          as="span"
          size="sm"
          className={row.severity === 'danger' ? 'text-destructive' : 'text-warning'}>
          <Plural value={row.issueCount} one="# issue" other="# issues" />
        </Text>
      );
    case 'healthy':
      return (
        <Text as="span" size="sm" className="text-success">
          <Trans>Healthy</Trans>
        </Text>
      );
    case 'unread':
      return (
        <Text as="span" size="sm" className="text-warning">
          <Trans>Couldn&apos;t read</Trans>
        </Text>
      );
    case 'loading':
      return <Skeleton className="h-4 w-14" />;
  }
}

function ProjectRow({ row }: { row: ProjectHealthRow }) {
  const detail =
    row.status === 'unread' ? (
      row.statusCode !== undefined ? (
        `${row.statusCode} ${STATUS_TEXT[row.statusCode] ?? ''}`.trim()
      ) : (
        <Trans>Some data couldn&apos;t be loaded</Trans>
      )
    ) : row.status === 'loading' && !Object.values(row.resources).some(Boolean) ? (
      // Nothing to show yet: "No resources" would be a guess while a source is loading.
      <Trans>Loading…</Trans>
    ) : (
      <ResourceSummary row={row} />
    );

  return (
    <li>
      <Link
        to={projectRoutes.detail(row.name)}
        className="hover:bg-muted/30 focus-visible:ring-ring -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors focus-visible:ring-2 focus-visible:outline-none">
        <span aria-hidden className={cn('size-2 shrink-0 rounded-full', dotClass(row))} />
        <span className="flex min-w-0 flex-1 flex-col">
          <Text as="span" size="sm" weight="medium" className="truncate">
            {row.name}
          </Text>
          <Text as="span" size="xs" textColor="muted" className="truncate">
            {detail}
          </Text>
        </span>
        <StatusLabel row={row} />
      </Link>
    </li>
  );
}

/**
 * The organization overview's Projects card (#770): each project with a
 * health dot, what it runs, and its issue count or "Healthy". A project whose
 * data couldn't be read says so, with the reason when known.
 */
export function OrgProjectsCard({ orgName, className }: { orgName: string; className?: string }) {
  const { rows, isLoading, isError } = useOrgProjectHealth(orgName);
  const { shown, hidden, showAll } = useShowMore(rows, VISIBLE_PROJECTS);

  return (
    <section className={className}>
      <SectionCard
        title={
          <span className="flex items-baseline gap-2">
            <Trans>Projects</Trans>
            {!isLoading && !isError && (
              <Text as="span" size="sm" textColor="muted" weight="normal">
                {rows.length}
              </Text>
            )}
          </span>
        }>
        {isLoading ? (
          <div className="flex flex-col gap-3 py-1" aria-busy="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : isError ? (
          <OverviewEmptyState
            icon={STATUS_ICONS.error}
            title={<Trans>Couldn&apos;t load the organization&apos;s projects</Trans>}
          />
        ) : rows.length === 0 ? (
          <OverviewEmptyState icon={ENTITY_ICONS.project} title={<Trans>No projects yet</Trans>} />
        ) : (
          <div className="flex flex-col gap-1">
            <ul className="divide-border flex flex-col divide-y">
              {shown.map((row) => (
                <ProjectRow key={row.name} row={row} />
              ))}
            </ul>
            {hidden > 0 && (
              <Button
                type="quaternary"
                theme="borderless"
                size="small"
                className="self-start"
                onClick={showAll}>
                <Trans>Show all {rows.length}</Trans>
              </Button>
            )}
          </div>
        )}
      </SectionCard>
    </section>
  );
}
