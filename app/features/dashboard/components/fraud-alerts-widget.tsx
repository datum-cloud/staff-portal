import { useFraudAlertsWidget } from '../hooks/use-fraud-alerts-widget';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { fraudRoutes } from '@/utils/config/routes.config';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
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
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { AlertCircle, ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router';

function getScoreColorClass(score: number | undefined): string {
  if (score === undefined) return 'text-muted-foreground';
  if (score >= 70) return 'text-red-600 dark:text-red-400';
  if (score >= 30) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

function LoadingSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted hover:bg-muted">
          <TableHead>
            <Skeleton className="h-3.5 w-12" />
          </TableHead>
          <TableHead>
            <Skeleton className="h-3.5 w-10" />
          </TableHead>
          <TableHead>
            <Skeleton className="h-3.5 w-16" />
          </TableHead>
          <TableHead>
            <Skeleton className="h-3.5 w-8" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 3 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-8" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-14" />
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
      <ShieldCheck className="text-muted-foreground mb-3 h-8 w-8" />
      <Title level={5} className="mb-1">
        <Trans>No fraud alerts</Trans>
      </Title>
      <Text size="sm" textColor="muted">
        <Trans>All evaluations are clear</Trans>
      </Text>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <AlertCircle className="text-muted-foreground mb-3 h-8 w-8" />
      <Title level={5} className="mb-1">
        <Trans>Could not load fraud alerts</Trans>
      </Title>
      <Button type="secondary" size="small" onClick={onRetry}>
        <Trans>Retry</Trans>
      </Button>
    </div>
  );
}

export function FraudAlertsWidget() {
  const navigate = useNavigate();
  const { alerts, totalCount, isLoading, isError, refetch } = useFraudAlertsWidget();

  return (
    <Card className="min-w-0 gap-0 py-0 md:col-span-2 lg:col-span-2 xl:col-span-2">
      <CardHeader className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-muted-foreground h-4 w-4" />
            <Title level={4}>
              <Trans>Fraud Alerts</Trans>
            </Title>
            {totalCount > 0 && (
              <Badge className="border-red-200 bg-red-100 text-xs font-medium text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {totalCount}
              </Badge>
            )}
          </div>
          <Button
            type="secondary"
            size="small"
            icon={<ArrowRight size={16} />}
            onClick={() => navigate(fraudRoutes.evaluations.list())}>
            <Trans>View All</Trans>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-h-[180px] px-4 pt-0 pb-3">
        {isLoading ? (
          <LoadingSkeleton />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : alerts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead>
                    <Text size="sm" textColor="muted">
                      <Trans>User</Trans>
                    </Text>
                  </TableHead>
                  <TableHead>
                    <Text size="sm" textColor="muted">
                      <Trans>Score</Trans>
                    </Text>
                  </TableHead>
                  <TableHead>
                    <Text size="sm" textColor="muted">
                      <Trans>Decision</Trans>
                    </Text>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <Text size="sm" textColor="muted">
                      <Trans>Age</Trans>
                    </Text>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow
                    key={alert.name}
                    className="cursor-pointer"
                    onClick={() => navigate(fraudRoutes.evaluations.detail(alert.name))}>
                    <TableCell className="max-w-[140px]">
                      <Text size="sm" className="truncate font-medium">
                        {alert.userDisplay}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-mono text-sm font-medium ${getScoreColorClass(alert.compositeScore)}`}>
                        {alert.compositeScore !== undefined ? alert.compositeScore : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <BadgeState
                        state={alert.decision === 'DEACTIVATE' ? 'error' : 'warning'}
                        message={alert.decision}
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Text size="sm" textColor="muted">
                        <DateTime date={alert.creationTimestamp} variant="relative" />
                      </Text>
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
