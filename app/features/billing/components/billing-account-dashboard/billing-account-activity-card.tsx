import { buildOrganizationNamespace } from '../../utils';
import { CardLink } from './card-parts';
import {
  createActivityClientConfig,
  getOrganizationControlPlanePath,
} from '@/features/activity/lib/activity-client';
import {
  staffResourceLinkResolver,
  staffTenantLinkResolver,
} from '@/features/activity/lib/activity-link-resolvers';
import { SectionCard } from '@/features/milo';
import { orgRoutes } from '@/utils/config/routes.config';
import { ActivityApiClient, ActivityFeed } from '@datum-cloud/activity-ui';
import { Trans } from '@lingui/react/macro';
import { useMemo } from 'react';

/** Billing activity often goes weeks without a change, so look further back than the feed's default. */
const TIME_RANGE = { start: 'now-90d' };

/**
 * People's recent changes to the org's billing resources: accounts,
 * bindings, payment methods and terms. Filters are fixed and hidden.
 */
export function BillingAccountActivityCard({ orgName }: { orgName: string }) {
  // Billing resources live on the org's control plane.
  const client = useMemo(
    () =>
      new ActivityApiClient(createActivityClientConfig(getOrganizationControlPlanePath(orgName))),
    [orgName]
  );
  const filters = useMemo(
    () => ({
      changeSource: 'human' as const,
      apiGroups: ['billing.miloapis.com'],
      resourceNamespaces: [buildOrganizationNamespace(orgName)],
    }),
    [orgName]
  );

  return (
    <SectionCard
      title={<Trans>Activity</Trans>}
      action={
        <CardLink href={orgRoutes.activity.root(orgName)}>
          <Trans>Activity log</Trans>
        </CardLink>
      }
      contentClassName="px-2 pb-2 [&_[data-slot=card]]:border-0 [&_[data-slot=card]]:bg-transparent [&_[data-slot=card]]:p-0">
      <ActivityFeed
        key={orgName}
        client={client}
        initialFilters={filters}
        initialTimeRange={TIME_RANGE}
        showFilters={false}
        compact
        pageSize={8}
        infiniteScroll={false}
        resourceLinkResolver={staffResourceLinkResolver}
        tenantLinkResolver={staffTenantLinkResolver}
        className="shadow-none"
      />
    </SectionCard>
  );
}
