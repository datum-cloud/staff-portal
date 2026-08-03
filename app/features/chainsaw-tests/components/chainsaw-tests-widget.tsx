import { useChainsawTests } from '../hooks/use-chainsaw-tests';
import type { ChainsawTestRow, ChainsawTestRun } from '../hooks/use-chainsaw-tests';
import { DateTime } from '@/components/date';
import { ACTION_ICONS, STATUS_ICONS } from '@/utils/config/icons.config';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader } from '@datum-cloud/datum-ui/card';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { FlaskConical } from 'lucide-react';

function LoadingSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted hover:bg-muted">
          <TableHead>
            <Skeleton className="h-3.5 w-24" />
          </TableHead>
          <TableHead>
            <Skeleton className="h-3.5 w-16" />
          </TableHead>
          <TableHead>
            <Skeleton className="h-3.5 w-32" />
          </TableHead>
          <TableHead>
            <Skeleton className="h-3.5 w-12" />
          </TableHead>
          <TableHead>
            <Skeleton className="h-3.5 w-20" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-40" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-14 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-6 w-20" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <FlaskConical className="text-muted-foreground mb-3 h-8 w-8" />
      <Title level={5} className="mb-1">
        <Trans>No stable tests labeled yet</Trans>
      </Title>
      <Text size="sm" textColor="muted">
        <Trans>
          Tests show up here once tagged metadata.labels.stability: stable in their
          chainsaw-test.yaml
        </Trans>
      </Text>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <STATUS_ICONS.alert className="text-muted-foreground mb-3 h-8 w-8" />
      <Title level={5} className="mb-1">
        <Trans>Could not load test results</Trans>
      </Title>
      <Button type="secondary" size="small" onClick={onRetry}>
        <Trans>Retry</Trans>
      </Button>
    </div>
  );
}

function RunTick({ run }: { run: ChainsawTestRun }) {
  const color = run.passed ? 'bg-green-500 dark:bg-green-400' : 'bg-red-500 dark:bg-red-400';
  return (
    <Tooltip
      side="top"
      message={
        <div className="flex flex-col leading-tight">
          <span className="font-medium">{run.passed ? 'Passed' : 'Failed'}</span>
          <DateTime date={new Date(run.timestamp).toISOString()} variant="relative" />
        </div>
      }>
      <span className={`inline-block h-3 w-1.5 rounded-sm ${color}`} />
    </Tooltip>
  );
}

function HistoryStrip({ history }: { history: ChainsawTestRun[] }) {
  if (history.length === 0) {
    return (
      <Text size="sm" textColor="muted">
        <Trans>No runs</Trans>
      </Text>
    );
  }
  return (
    <div className="flex items-center gap-0.5">
      {history.map((run) => (
        <RunTick key={run.timestamp} run={run} />
      ))}
    </div>
  );
}

function LatestBadge({ latest }: { latest: ChainsawTestRow['latest'] }) {
  if (!latest) {
    return (
      <Text size="sm" textColor="muted">
        <Trans>Unknown</Trans>
      </Text>
    );
  }
  return latest.passed ? (
    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
      <STATUS_ICONS.success className="h-3.5 w-3.5" />
      <Text size="sm" className="font-medium">
        <Trans>Passing</Trans>
      </Text>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
      <STATUS_ICONS.error className="h-3.5 w-3.5" />
      <Text size="sm" className="font-medium">
        <Trans>Failing</Trans>
      </Text>
    </span>
  );
}

export function ChainsawTestsWidget() {
  const { data, isLoading, isError, refetch } = useChainsawTests();
  const tests = data?.tests ?? [];

  return (
    <Card className="min-w-0 gap-0 py-0">
      <CardHeader className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="text-muted-foreground h-4 w-4" />
            <Title level={4}>
              <Trans>Chainsaw Tests</Trans>
            </Title>
            <Text size="sm" textColor="muted">
              <Trans>Last 3 days · tests expected to pass every run</Trans>
            </Text>
          </div>
          {data?.githubActionsUrl && (
            <LinkButton
              href={data.githubActionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              theme="outline"
              size="small"
              icon={<ACTION_ICONS.externalLink size={12} />}
              iconPosition="right">
              <Trans>CI runs</Trans>
            </LinkButton>
          )}
        </div>
      </CardHeader>
      <CardContent className="min-h-[180px] px-4 pt-0 pb-3">
        {isLoading ? (
          <LoadingSkeleton />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : tests.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead>
                    <Text size="sm" textColor="muted">
                      <Trans>Test</Trans>
                    </Text>
                  </TableHead>
                  <TableHead>
                    <Text size="sm" textColor="muted">
                      <Trans>Suite</Trans>
                    </Text>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <Text size="sm" textColor="muted">
                      <Trans>Last 3 days</Trans>
                    </Text>
                  </TableHead>
                  <TableHead>
                    <Text size="sm" textColor="muted">
                      <Trans>Latest</Trans>
                    </Text>
                  </TableHead>
                  <TableHead>
                    <Text size="sm" textColor="muted">
                      <Trans>Links</Trans>
                    </Text>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="max-w-[180px]">
                      <Text size="sm" className="truncate font-medium">
                        {row.test}
                      </Text>
                      <Text size="sm" textColor="muted" className="md:hidden">
                        {row.environment}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <Text size="sm" textColor="muted">
                        {row.suite}
                        <span className="hidden md:inline"> · {row.environment}</span>
                      </Text>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <HistoryStrip history={row.history} />
                    </TableCell>
                    <TableCell>
                      <LatestBadge latest={row.latest} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <LinkButton
                          href={row.grafanaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          theme="outline"
                          size="small"
                          icon={<ACTION_ICONS.externalLink size={12} />}
                          iconPosition="right">
                          <Trans>Grafana</Trans>
                        </LinkButton>
                        <LinkButton
                          href={row.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          theme="outline"
                          size="small"
                          icon={<ACTION_ICONS.externalLink size={12} />}
                          iconPosition="right">
                          <Trans>Test docs</Trans>
                        </LinkButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
