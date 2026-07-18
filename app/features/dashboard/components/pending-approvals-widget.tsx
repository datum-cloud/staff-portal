import { usePendingApprovalsWidget } from '../hooks/use-pending-approvals-widget';
import { DateTime } from '@/components/date';
import { EMBEDDED_TABLE_HEADER_CELL_CLASS, LIST_TABLE_ROW_CLASS, TableCard } from '@/features/milo';
import { STATUS_ICONS } from '@/utils/config/icons.config';
import { userRoutes } from '@/utils/config/routes.config';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
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
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import { ArrowRight, UserCheck } from 'lucide-react';
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
      <STATUS_ICONS.alert className="text-muted-foreground mb-3 h-8 w-8" />
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
    <TableCard
      className="min-w-0 md:col-span-2 lg:col-span-2 xl:col-span-2"
      title={
        <span className="flex items-center gap-2">
          <UserCheck className="text-muted-foreground h-4 w-4" />
          <Title level={4} className="mb-0">
            <Trans>Pending Approvals</Trans>
          </Title>
          {totalCount > 0 && (
            <Badge className="border-yellow-200 bg-yellow-100 text-xs font-medium text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
              {totalCount}
            </Badge>
          )}
        </span>
      }
      action={
        <Button
          type="secondary"
          size="small"
          icon={<ArrowRight size={16} />}
          onClick={() => navigate(userRoutes.list())}>
          <Trans>View All</Trans>
        </Button>
      }
      contentClassName="min-h-[180px]">
      {isLoading ? (
        <div className="px-4 pb-3">
          <LoadingSkeleton />
        </div>
      ) : isError ? (
        <div className="px-4 pb-3">
          <ErrorState onRetry={refetch} />
        </div>
      ) : approvals.length === 0 ? (
        <div className="px-4 pb-3">
          <EmptyState />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="[&_tr]:border-0">
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead className={EMBEDDED_TABLE_HEADER_CELL_CLASS}>
                  <Trans>Name</Trans>
                </TableHead>
                <TableHead className={cn(EMBEDDED_TABLE_HEADER_CELL_CLASS, 'hidden md:table-cell')}>
                  <Trans>Email</Trans>
                </TableHead>
                <TableHead className={EMBEDDED_TABLE_HEADER_CELL_CLASS}>
                  <Trans>Waiting Since</Trans>
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
                    className={cn(LIST_TABLE_ROW_CLASS, 'cursor-pointer')}
                    onClick={() => navigate(userRoutes.detail(approval.name))}>
                    <TableCell className="border-border px-4 py-0.5 text-sm">
                      <Text size="sm" className="font-medium">
                        {fullName}
                      </Text>
                    </TableCell>
                    <TableCell className="border-border hidden max-w-[160px] px-4 py-0.5 text-sm md:table-cell">
                      <Text size="sm" className="truncate">
                        {approval.email || '—'}
                      </Text>
                    </TableCell>
                    <TableCell className="border-border px-4 py-0.5 text-sm">
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
    </TableCard>
  );
}
