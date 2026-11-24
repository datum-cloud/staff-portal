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
 * Recent billing activity for every billing account in the org (the
 * activity API can't narrow to one account): what people changed (accounts,
 * bindings, payment methods, terms) and what happened to the bills (invoices
 * issued, emailed, paid, declined, past due, voided). The second kind is
 * recorded by the billing providers as events, which the activity API calls
 * `system` changes, so both sources are shown. That lets in no controller
 * noise: billing's activity policies skip writes by service accounts and
 * only turn billing's own timeline events into activity. Filters are fixed
 * and hidden.
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
      changeSource: 'all' as const,
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
