import { CardRowSkeleton } from './card-row-skeleton';
import { DateTime } from '@/components/date';
import { SectionCard } from '@/features/milo';
import { useServiceConsumersEnrichedQuery } from '@/resources/request/client';
import { serviceCatalogRoutes } from '@/utils/config/routes.config';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { CheckSquare } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

const MAX_ROWS = 5;

interface Props {
  producerProject: string | undefined;
  serviceName: string;
  canonicalName: string;
}

/**
 * Overview panel for gated services: how many consumer projects are waiting
 * on approval, with the oldest few listed and a link to the Approvals tab.
 *
 * Uses the same gateway query (and query key) as `PendingApprovalsBadge` and
 * the Approvals tab, so react-query dedupes it with them.
 */
export function PendingApprovalsCard({ producerProject, serviceName, canonicalName }: Props) {
  // The consumer's serviceRef may hold either the Service's metadata.name or
  // its canonical spec.serviceName, so ask the gateway for both.
  const serviceNames = [...new Set([serviceName, canonicalName].filter((n): n is string => !!n))];
  const { data, isLoading, error } = useServiceConsumersEnrichedQuery(
    producerProject,
    serviceNames
  );

  const pending = useMemo(
    () =>
      (data ?? [])
        .filter((c) => c.phase === 'PendingApproval' && !c.approvalDecision)
        .sort((a, b) => (a.requestedAt ?? '').localeCompare(b.requestedAt ?? '')),
    [data]
  );

  const remaining = pending.length - MAX_ROWS;

  const is403 =
    error instanceof Error &&
    (error.message.includes('403') || error.message.includes('Forbidden'));

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          <Trans>Pending approvals</Trans>
          {pending.length > 0 && (
            <Text
              size="xs"
              weight="medium"
              textColor="primary"
              className="bg-primary/10 inline-flex min-w-5 items-center justify-center rounded-full px-1.5">
              {pending.length}
            </Text>
          )}
        </span>
      }
      action={
        <Link
          to={serviceCatalogRoutes.approvals(serviceName)}
          className="text-primary text-sm hover:underline">
          <Trans>View all</Trans>
        </Link>
      }>
      {isLoading ? (
        <CardRowSkeleton count={2} />
      ) : error ? (
        <Text size="sm" textColor="muted" className="italic">
          {is403 ? (
            <Trans>Access denied — IAM role pending.</Trans>
          ) : (
            <Trans>Failed to load approvals.</Trans>
          )}
        </Text>
      ) : pending.length === 0 ? (
        <Text size="sm" textColor="muted" className="italic">
          <Trans>No pending approval requests.</Trans>
        </Text>
      ) : (
        <div className="flex flex-col divide-y">
          {pending.slice(0, MAX_ROWS).map((c) => (
            <div
              key={c.name}
              className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-col gap-0.5">
                <Text size="sm" className="truncate font-medium">
                  {c.consumerProject.displayName || c.consumerProject.name || c.name}
                </Text>
                {c.consumerProject.organizationDisplayName && (
                  <Text size="xs" textColor="muted" className="truncate">
                    {c.consumerProject.organizationDisplayName}
                  </Text>
                )}
              </div>
              {c.requestedAt && (
                <Text size="xs" textColor="muted" className="shrink-0">
                  <DateTime date={c.requestedAt} variant="relative" addSuffix />
                </Text>
              )}
            </div>
          ))}
          {remaining > 0 && (
            <Text size="xs" textColor="muted" className="pt-2">
              <Trans>and {remaining} more</Trans>
            </Text>
          )}
        </div>
      )}
    </SectionCard>
  );
}
