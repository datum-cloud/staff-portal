import { buildOrganizationNamespace } from '../../utils';
import { CardLink } from './card-parts';
import {
  createActivityClientConfig,
  getOrganizationControlPlanePath,
} from '@/features/activity/lib/activity-client';
import { staffResourceLinkResolver } from '@/features/activity/lib/activity-link-resolvers';
import { SectionCard } from '@/features/milo';
import { orgRoutes } from '@/utils/config/routes.config';
import { ActivityApiClient, ActivityFeed } from '@datum-cloud/activity-ui';
import { Trans } from '@lingui/react/macro';
import { useMemo } from 'react';

/**
 * Billing activity often goes weeks without a change, so look as far back
 * as the activity API allows (720h).
 */
const TIME_RANGE = { start: 'now-30d' };

/** Changes shown in the card; the activity log has the rest. */
const ACTIVITY_PAGE_SIZE = 8;

/** Every row is in this org, so its tenant badge adds nothing. */
const hideTenant = () => null;

/**
 * People's recent changes to the org's billing resources, for every billing
 * account in it (the activity API can't narrow to one account): accounts,
 * bindings, payment methods and terms. Only changes people made
 * (`changeSource: human`), never controllers'. Filters are fixed and hidden.
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
      // Billing activity can only be filtered by org, not by account.
      title={<Trans>Organization billing activity</Trans>}
      action={
        <CardLink href={orgRoutes.activity.root(orgName)}>
          <Trans>Activity log</Trans>
        </CardLink>
      }
      contentClassName="pb-2 [&_[data-slot=card]]:border-0 [&_[data-slot=card]]:bg-transparent [&_[data-slot=card]]:p-0">
      <ActivityFeed
        key={orgName}
        client={client}
        initialFilters={filters}
        initialTimeRange={TIME_RANGE}
        showFilters={false}
        hiddenFilters={['changeSource', 'apiGroups', 'resourceNamespaces']}
        variant="timeline"
        compact
        pageSize={ACTIVITY_PAGE_SIZE}
        infiniteScroll={false}
        resourceLinkResolver={staffResourceLinkResolver}
        tenantRenderer={hideTenant}
        className="shadow-none"
      />
    </SectionCard>
  );
}
