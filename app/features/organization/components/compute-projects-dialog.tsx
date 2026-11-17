import { useOrgComputeStatus } from '../hooks/use-org-compute-status';
import {
  countComputeProjects,
  filterComputeProjects,
  summarizeComputeProjects,
  type ComputeProjectCounts,
  type ComputeProjectRow,
  type ProblemCount,
} from '../lib/compute-projects';
import type { OrgIssue } from '../lib/org-issues';
import { projectRoutes } from '@/utils/config/routes.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { ArrowRight } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';

/** Show the search box above this many projects. */
const SEARCH_THRESHOLD = 10;

const COLUMN = 'w-20 shrink-0 text-right';

/**
 * The column layout shared by the header and every row, so they always line
 * up: a dot-sized lead, the project, two count columns, an arrow-sized tail.
 */
function RowLayout({
  lead,
  project,
  workloads,
  instances,
  tail,
}: {
  lead?: ReactNode;
  project: ReactNode;
  workloads: ReactNode;
  instances: ReactNode;
  tail?: ReactNode;
}) {
  return (
    <>
      <span className="flex size-2 shrink-0">{lead}</span>
      <span className="flex min-w-0 flex-1 flex-col">{project}</span>
      <span className={COLUMN}>{workloads}</span>
      <span className={COLUMN}>{instances}</span>
      <span className="flex size-3.5 shrink-0">{tail}</span>
    </>
  );
}

function dotClass(row: ComputeProjectRow): string {
  switch (row.status) {
    case 'problems':
      return row.severity === 'warning' ? 'bg-warning' : 'bg-destructive';
    case 'healthy':
      return 'bg-success';
    case 'error':
      return 'bg-muted-foreground';
    case 'loading':
    case 'empty':
      return 'bg-muted-foreground/40';
  }
}

function statusLine(row: ComputeProjectRow): ReactNode {
  const problems = row.workloads.problems + row.instances.problems;
  switch (row.status) {
    case 'problems':
      return <Plural value={problems} one="# problem" other="# problems" />;
    case 'loading':
      return <Trans>Loading…</Trans>;
    case 'error':
      return <Trans>Couldn&apos;t load</Trans>;
    case 'healthy':
      return <Trans>Healthy</Trans>;
    case 'empty':
      return <Trans>No compute</Trans>;
  }
}

/** "problems / total", with the problems coloured; read out in full for screen readers. */
function Count({
  count,
  area,
  severity,
}: {
  count: ProblemCount;
  area: 'workloads' | 'instances';
  severity?: 'danger' | 'warning';
}) {
  const { problems, total } = count;
  return (
    <Text as="span" size="sm" textColor="muted" className="tabular-nums">
      <span aria-hidden>
        <span
          className={cn(
            problems > 0 && 'font-medium',
            problems > 0 && (severity === 'danger' ? 'text-destructive' : 'text-warning')
          )}>
          {problems}
        </span>{' '}
        / {total}
      </span>
      <span className="sr-only">
        {area === 'workloads' ? (
          <Trans>
            {problems} of {total} workloads with problems
          </Trans>
        ) : (
          <Trans>
            {problems} of {total} instances with problems
          </Trans>
        )}
      </span>
    </Text>
  );
}

const Dash = () => (
  <Text as="span" size="sm" textColor="muted">
    —
  </Text>
);

const ROW = 'flex items-center gap-3 px-2 py-2.5';

function ProjectRow({ row, pluginSlug }: { row: ComputeProjectRow; pluginSlug: string }) {
  const muted = row.status === 'healthy' || row.status === 'empty';
  const counts = (area: 'workloads' | 'instances') => {
    if (row.status === 'loading') return <Skeleton className="ml-auto h-4 w-12" />;
    if (row.status === 'error' || row.status === 'empty') return <Dash />;
    return <Count count={row[area]} area={area} severity={row.severity} />;
  };

  return (
    <li>
      <Link
        to={projectRoutes.plugin.mount(row.name, pluginSlug)}
        className={cn(
          ROW,
          'hover:bg-muted/30 focus-visible:ring-ring rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none'
        )}>
        <RowLayout
          lead={<span aria-hidden className={cn('size-2 rounded-full', dotClass(row))} />}
          project={
            <>
              <Text
                as="span"
                size="sm"
                weight="medium"
                textColor={muted ? 'muted' : undefined}
                className="truncate">
                {row.name}
              </Text>
              <Text
                as="span"
                size="xs"
                textColor="muted"
                className={cn(row.status === 'error' && 'text-destructive')}>
                {statusLine(row)}
              </Text>
            </>
          }
          workloads={counts('workloads')}
          instances={counts('instances')}
          tail={<Icon icon={ArrowRight} size={14} aria-hidden className="text-muted-foreground" />}
        />
      </Link>
    </li>
  );
}

function SkeletonRows() {
  return (
    <ul aria-hidden className="divide-border flex flex-col divide-y">
      {Array.from({ length: 3 }).map((_, index) => (
        <li key={index} className={ROW}>
          <RowLayout
            project={<Skeleton className="h-4 w-40" />}
            workloads={<Skeleton className="ml-auto h-4 w-12" />}
            instances={<Skeleton className="ml-auto h-4 w-12" />}
          />
        </li>
      ))}
    </ul>
  );
}

/** One line on what the dialog knows so far. Never says "no problems" while some projects are unknown. */
function Summary({ counts, listLoading }: { counts: ComputeProjectCounts; listLoading: boolean }) {
  const { total, problems, loading, unread } = counts;
  if (listLoading) return <Trans>Loading projects…</Trans>;

  const known = total - loading - unread;
  const headline =
    problems > 0 ? (
      <Trans>
        {problems} of <Plural value={total} one="# project" other="# projects" /> have problems
      </Trans>
    ) : loading + unread === 0 ? (
      <Plural
        value={total}
        one="# project, no compute problems"
        other="# projects, no compute problems"
      />
    ) : known > 0 ? (
      <Plural
        value={known}
        one="No compute problems in the # project checked so far"
        other="No compute problems in the # projects checked so far"
      />
    ) : (
      <Plural value={total} one="Checking # project" other="Checking # projects" />
    );

  return (
    <>
      {headline}
      {loading > 0 && known + unread > 0 && (
        <>
          {' · '}
          <Plural value={loading} one="# still loading" other="# still loading" />
        </>
      )}
      {unread > 0 && (
        <>
          {' · '}
          <Plural value={unread} one="# couldn't be read" other="# couldn't be read" />
        </>
      )}
    </>
  );
}

/** The dialog's content. Only mounted while the dialog is open, so it does no work otherwise. */
function ComputeProjectsContent({
  orgName,
  issues,
  onClose,
}: {
  orgName: string;
  issues: readonly OrgIssue[];
  onClose: () => void;
}) {
  const { t } = useLingui();
  const { projects, pluginSlug, isLoading } = useOrgComputeStatus(orgName);
  const [query, setQuery] = useState('');

  const rows = useMemo(() => summarizeComputeProjects(projects, issues), [projects, issues]);
  const counts = countComputeProjects(rows);
  const visible = filterComputeProjects(rows, query);

  const list = (() => {
    if (isLoading || !pluginSlug) return <SkeletonRows />;
    if (visible.length === 0) {
      return (
        <Text size="sm" textColor="muted" className="px-2 py-4">
          {query ? <Trans>No projects match.</Trans> : <Trans>No projects.</Trans>}
        </Text>
      );
    }
    return (
      <ul className="divide-border flex max-h-96 flex-col divide-y overflow-y-auto">
        {visible.map((row) => (
          <ProjectRow key={row.name} row={row} pluginSlug={pluginSlug} />
        ))}
      </ul>
    );
  })();

  return (
    <>
      <Dialog.Header
        title={<Trans>Compute by project</Trans>}
        description={<Summary counts={counts} listLoading={isLoading} />}
      />
      <Dialog.Body className="flex flex-col gap-1 px-5">
        {rows.length > SEARCH_THRESHOLD && (
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t`Search projects`}
            aria-label={t`Search projects`}
            className="mb-2"
          />
        )}
        <div aria-hidden className="bg-muted flex items-center gap-3 rounded-md px-2 py-2">
          <RowLayout
            project={
              <Text size="xs" weight="semibold" textColor="muted">
                <Trans>Project</Trans>
              </Text>
            }
            workloads={
              <Text size="xs" weight="semibold" textColor="muted">
                <Trans>Workloads</Trans>
              </Text>
            }
            instances={
              <Text size="xs" weight="semibold" textColor="muted">
                <Trans>Instances</Trans>
              </Text>
            }
          />
        </div>
        {list}
      </Dialog.Body>
      <Dialog.Footer>
        <Button type="quaternary" theme="borderless" onClick={onClose}>
          <Trans>Close</Trans>
        </Button>
      </Dialog.Footer>
    </>
  );
}

/**
 * Compute by project (#835): opened from the overview's Workloads and
 * Instances tiles. Lists every project with its workload and instance
 * problems, worst first; each row opens that project's compute page. `issues`
 * come from the strip, and the compute data is the strip's cached queries, so
 * opening it fetches nothing new.
 */
export function ComputeProjectsDialog({
  orgName,
  issues,
  open,
  onOpenChange,
}: {
  orgName: string;
  issues: readonly OrgIssue[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="sm:max-w-2xl">
        <ComputeProjectsContent
          orgName={orgName}
          issues={issues}
          onClose={() => onOpenChange(false)}
        />
      </Dialog.Content>
    </Dialog>
  );
}
