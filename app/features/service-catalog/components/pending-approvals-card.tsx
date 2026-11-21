import { usePendingApprovals } from '../hooks/usePendingApprovals';
import { CardRowSkeleton } from './card-row-skeleton';
import { PendingApprovalsBadge } from './pending-approvals-badge';
import { DateTime } from '@/components/date';
import { SectionCard } from '@/features/milo';
import { orgRoutes, projectRoutes, serviceCatalogRoutes } from '@/utils/config/routes.config';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Plural, Trans } from '@lingui/react/macro';
import { CheckSquare } from 'lucide-react';
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
 * A load failure stays inside the card rather than failing the Overview.
 */
export function PendingApprovalsCard({ producerProject, serviceName, canonicalName }: Props) {
  const { pending, isLoading, error, refetch } = usePendingApprovals(
    producerProject,
    serviceName,
    canonicalName
  );

  const remaining = pending.length - MAX_ROWS;

  const is403 =
    error instanceof Error &&
    (error.message.includes('403') || error.message.includes('Forbidden'));

  const body = () => {
    // Without an owner project the query never runs, so "none pending" would
    // be a guess.
    if (!producerProject) {
      return (
        <Text size="sm" textColor="muted" className="italic">
          <Trans>This service has no owner project, so its approvals cannot be loaded.</Trans>
        </Text>
      );
    }
    if (isLoading) return <CardRowSkeleton count={2} />;
    if (error) {
      return (
        <div className="flex flex-col gap-1">
          <Text size="sm" textColor="muted" className="italic">
            {is403 ? (
              <Trans>Access denied — IAM role pending.</Trans>
            ) : (
              <Trans>Failed to load approvals.</Trans>
            )}
          </Text>
          {!is403 && (
            <div className="flex items-baseline gap-2">
              <Text size="xs" textColor="muted">
                {error instanceof Error ? error.message : String(error)}
              </Text>
              <button onClick={() => refetch()} className="text-primary text-sm hover:underline">
                <Trans>Retry</Trans>
              </button>
            </div>
          )}
        </div>
      );
    }
    if (pending.length === 0) {
      return (
        <Text size="sm" textColor="muted" className="italic">
          <Trans>No pending approval requests.</Trans>
        </Text>
      );
    }
    return (
      <div className="flex flex-col divide-y">
        {pending.slice(0, MAX_ROWS).map((c) => {
          const { name, displayName, organizationName, organizationDisplayName } =
            c.consumerProject;
          return (
            <div
              key={c.name}
              className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-col gap-0.5">
                {name ? (
                  <Link
                    to={projectRoutes.detail(name)}
                    className="text-primary truncate text-sm font-medium hover:underline">
                    {displayName || name}
                  </Link>
                ) : (
                  <Text size="sm" className="truncate font-medium">
                    {c.name}
                  </Text>
                )}
                {organizationName && (
                  <Link
                    to={orgRoutes.detail(organizationName)}
                    className="text-muted-foreground truncate text-xs hover:underline">
                    {organizationDisplayName || organizationName}
                  </Link>
                )}
              </div>
              {c.requestedAt && (
                <Text size="xs" textColor="muted" className="shrink-0">
                  <DateTime date={c.requestedAt} variant="relative" addSuffix />
                </Text>
              )}
            </div>
          );
        })}
        {remaining > 0 && (
          <Text size="xs" textColor="muted" className="pt-2">
            <Plural value={remaining} one="and # more request" other="and # more requests" />
          </Text>
        )}
      </div>
    );
  };

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          <Trans>Pending approvals</Trans>
          <PendingApprovalsBadge
            producerProject={producerProject}
            serviceName={serviceName}
            canonicalName={canonicalName}
          />
        </span>
      }
      action={
        <Link
          to={serviceCatalogRoutes.approvals(serviceName)}
          className="text-primary text-sm hover:underline">
          <Trans>View all</Trans>
        </Link>
      }>
      {body()}
    </SectionCard>
  );
}
