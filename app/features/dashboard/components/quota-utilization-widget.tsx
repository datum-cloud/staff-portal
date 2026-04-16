import { useQuotaUtilizationWidget } from '../hooks/use-quota-utilization-widget';
import { orgRoutes } from '@/utils/config/routes.config';
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
import { AlertCircle, Gauge, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router';

function getUtilizationColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500 dark:bg-red-400';
  if (percentage >= 70) return 'bg-yellow-500 dark:bg-yellow-400';
  return 'bg-green-500 dark:bg-green-400';
}

function getUtilizationTextColor(percentage: number): string {
  if (percentage >= 90) return 'text-red-600 dark:text-red-400';
  if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

function formatResourceType(type: string): string {
  const parts = type.split('/');
  const resource = parts[parts.length - 1];
  return resource.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

function LoadingSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted hover:bg-muted">
          <TableHead>
            <Skeleton className="h-3.5 w-20" />
          </TableHead>
          <TableHead>
            <Skeleton className="h-3.5 w-12" />
          </TableHead>
          <TableHead>
            <Skeleton className="h-3.5 w-16" />
          </TableHead>
          <TableHead>
            <Skeleton className="h-3.5 w-12" />
          </TableHead>
          <TableHead>
            <Skeleton className="h-3.5 w-16" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 3 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-16" />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Skeleton className="h-2 w-[100px] rounded-full" />
                <Skeleton className="h-4 w-10" />
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-4 w-10" />
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
        <Trans>All quotas healthy</Trans>
      </Title>
      <Text size="sm" textColor="muted">
        <Trans>No quotas are above 70% utilization</Trans>
      </Text>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <AlertCircle className="text-muted-foreground mb-3 h-8 w-8" />
      <Title level={5} className="mb-1">
        <Trans>Could not load quota data</Trans>
      </Title>
      <Button type="secondary" size="small" onClick={onRetry}>
        <Trans>Retry</Trans>
      </Button>
    </div>
  );
}

export function QuotaUtilizationWidget() {
  const navigate = useNavigate();
  const { buckets, isLoading, isError, refetch } = useQuotaUtilizationWidget();

  return (
    <Card className="min-w-0 gap-0 py-0 md:col-span-2 lg:col-span-2 xl:col-span-2">
      <CardHeader className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Gauge className="text-muted-foreground h-4 w-4" />
          <Title level={4}>
            <Trans>Quota Utilization</Trans>
          </Title>
        </div>
      </CardHeader>
      <CardContent className="min-h-[180px] px-4 pt-0 pb-3">
        {isLoading ? (
          <LoadingSkeleton />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : buckets.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead>
                    <Text size="sm" textColor="muted">
                      <Trans>Organization</Trans>
                    </Text>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <Text size="sm" textColor="muted">
                      <Trans>Owner</Trans>
                    </Text>
                  </TableHead>
                  <TableHead>
                    <Text size="sm" textColor="muted">
                      <Trans>Resource</Trans>
                    </Text>
                  </TableHead>
                  <TableHead>
                    <Text size="sm" textColor="muted">
                      <Trans>Usage</Trans>
                    </Text>
                  </TableHead>
                  <TableHead className="text-right">
                    <Text size="sm" textColor="muted">
                      <Trans>Utilization</Trans>
                    </Text>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buckets.map((bucket) => (
                  <TableRow
                    key={`${bucket.orgName}-${bucket.resourceType}`}
                    className="cursor-pointer"
                    onClick={() => navigate(orgRoutes.quota.usage(bucket.orgName))}>
                    <TableCell>
                      <div className="flex flex-col">
                        <Text size="sm" className="font-medium">
                          {bucket.orgDisplayName}
                        </Text>
                        {bucket.orgDisplayName !== bucket.orgName && (
                          <Text size="xs" textColor="muted">
                            {bucket.orgName}
                          </Text>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="max-w-[160px]">
                        <Text size="sm" className="block truncate" textColor="muted">
                          {bucket.ownerEmail || '—'}
                        </Text>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Text size="sm">{formatResourceType(bucket.resourceType)}</Text>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="bg-muted h-2 w-full max-w-[100px] overflow-hidden rounded-full">
                          <div
                            className={`h-full rounded-full transition-all ${getUtilizationColor(bucket.percentage)}`}
                            style={{ width: `${Math.min(bucket.percentage, 100)}%` }}
                          />
                        </div>
                        <Text size="sm" textColor="muted" className="shrink-0">
                          {bucket.allocated}/{bucket.limit}
                        </Text>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`text-sm font-medium ${getUtilizationTextColor(bucket.percentage)}`}>
                        {bucket.percentage}%
                      </span>
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
