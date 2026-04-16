import { usePendingApprovalsWidget } from '../hooks/use-pending-approvals-widget';
import { DateTime } from '@/components/date';
import { userRoutes } from '@/utils/config/routes.config';
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
import { AlertCircle, ArrowRight, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router';

function LoadingSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted hover:bg-muted">
          <TableHead>
            <Skeleton className="h-3.5 w-12" />
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
        {Array.from({ length: 3 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-16" />
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
      <UserCheck className="text-muted-foreground mb-3 h-8 w-8" />
      <Title level={5} className="mb-1">
        <Trans>No pending approvals</Trans>
      </Title>
      <Text size="sm" textColor="muted">
        <Trans>All registrations are up to date</Trans>
      </Text>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <AlertCircle className="text-muted-foreground mb-3 h-8 w-8" />
      <Title level={5} className="mb-1">
        <Trans>Could not load pending approvals</Trans>
      </Title>
      <Button type="secondary" size="small" onClick={onRetry}>
        <Trans>Retry</Trans>
      </Button>
    </div>
  );
}

export function PendingApprovalsWidget() {
  const navigate = useNavigate();
  const { approvals, totalCount, isLoading, isError, refetch } = usePendingApprovalsWidget();

  return (
    <Card className="min-w-0 gap-0 py-0 md:col-span-2 lg:col-span-2 xl:col-span-2">
      <CardHeader className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="text-muted-foreground h-4 w-4" />
            <Title level={4}>
              <Trans>Pending Approvals</Trans>
            </Title>
            {totalCount > 0 && (
              <Badge className="border-yellow-200 bg-yellow-100 text-xs font-medium text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                {totalCount}
              </Badge>
            )}
          </div>
          <Button
            type="secondary"
            size="small"
            icon={<ArrowRight size={16} />}
            onClick={() => navigate(userRoutes.list())}>
            <Trans>View All</Trans>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-h-[180px] px-4 pt-0 pb-3">
        {isLoading ? (
          <LoadingSkeleton />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : approvals.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead>
                    <Text size="sm" textColor="muted">
                      <Trans>Name</Trans>
                    </Text>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <Text size="sm" textColor="muted">
                      <Trans>Email</Trans>
                    </Text>
                  </TableHead>
                  <TableHead>
                    <Text size="sm" textColor="muted">
                      <Trans>Waiting Since</Trans>
                    </Text>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.map((approval) => {
                  const fullName =
                    [approval.givenName, approval.familyName].filter(Boolean).join(' ') ||
                    approval.name;

                  return (
                    <TableRow
                      key={approval.name}
                      className="cursor-pointer"
                      onClick={() => navigate(userRoutes.detail(approval.name))}>
                      <TableCell>
                        <Text size="sm" className="font-medium">
                          {fullName}
                        </Text>
                      </TableCell>
                      <TableCell className="hidden max-w-[160px] md:table-cell">
                        <Text size="sm" className="truncate">
                          {approval.email || '—'}
                        </Text>
                      </TableCell>
                      <TableCell>
                        <Text size="sm" textColor="muted">
                          <DateTime date={approval.creationTimestamp} variant="relative" />
                        </Text>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
