import { getContractState, offerBillsUsage } from '../../lib/contract';
import { getBillingMode } from '../../lib/payment-terms';
import {
  DEFAULT_SERVICE_PRICING_NAMESPACE,
  getBillingAccountDisplayName,
  type BillingAccount,
} from '../../utils';
import { AccountPriceList } from './account-price-list';
import { AccountStatusBadge } from './account-status-badge';
import { BillingAccountChargesCard } from './billing-account-charges-card';
import { BillingAccountHealthCards } from './billing-account-health-cards';
import { BillingAccountPlanCard } from './billing-account-plan-card';
import { CardLink, CardMessage } from './card-parts';
import { EmptyState } from '@/components/empty-state';
import { SectionCard } from '@/features/milo';
import {
  useBillingAccountListForOrgQuery,
  useBillingEntitlementForAccountQuery,
  useOfferDetailQuery,
  useServicePricingListQuery,
} from '@/resources/request/client';
import { STATUS_ICONS } from '@/utils/config/icons.config';
import { billingAccountRoutes } from '@/utils/config/routes.config';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { useMemo, useState } from 'react';

/**
 * An organization's billing at a glance, on its own page in the
 * organization's rail: for each of its billing accounts, what's owed and
 * what's next, what it's on (contract or offer), the prices it pays, and
 * its one-off charges. It's for reading only: anything that changes the
 * account is done on the billing account's own page, which it links to.
 */
export function OrgBillingOverview({ orgName }: { orgName: string }) {
  const accountsQuery = useBillingAccountListForOrgQuery(orgName);
  const accounts = accountsQuery.data?.items ?? [];

  if (accountsQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-24 w-full rounded" />
        <Skeleton className="h-64 w-full rounded" />
      </div>
    );
  }
  if (accountsQuery.isError) {
    return (
      <EmptyState
        size="sm"
        icon={STATUS_ICONS.alert}
        title={<Trans>Couldn&apos;t load the organization&apos;s billing accounts</Trans>}
      />
    );
  }
  if (accounts.length === 0) {
    return (
      <EmptyState
        size="sm"
        title={<Trans>No billing account</Trans>}
        description={
          <Trans>This organization has no billing account, so nothing is billed to it.</Trans>
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-8">
      {accounts.map((account) => (
        <OrgBillingAccount key={account.metadata?.name} orgName={orgName} account={account} />
      ))}
    </div>
  );
}

function OrgBillingAccount({ orgName, account }: { orgName: string; account: BillingAccount }) {
  const accountName = account.metadata?.name ?? '';
  // Fixed for the page's life, so every card measures from the same moment.
  const [now] = useState(() => new Date());
  const entitlementQuery = useBillingEntitlementForAccountQuery(orgName, accountName);
  const contract = useMemo(
    () => getContractState(entitlementQuery.data ?? null, now),
    [entitlementQuery.data, now]
  );
  const offerQuery = useOfferDetailQuery(entitlementQuery.data?.spec?.offerRef?.name ?? '');
  const offer = offerQuery.data;
  const pricingsQuery = useServicePricingListQuery(DEFAULT_SERVICE_PRICING_NAMESPACE);
  const usageNotBilled = Boolean(contract && offer && !offerBillsUsage(offer));
  const mode = getBillingMode(account);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <Text size="lg" weight="medium" ellipsis>
              {getBillingAccountDisplayName(account)}
            </Text>
            <AccountStatusBadge orgName={orgName} account={account} />
          </div>
          <Text size="sm" textColor="muted">
            {contract ? <Trans>On a contract</Trans> : <Trans>Pay as you go</Trans>}
            {' · '}
            {mode === 'invoice' ? (
              <Trans>billed by invoice</Trans>
            ) : mode === 'card' ? (
              <Trans>pays by card</Trans>
            ) : (
              <Trans>no payment method yet</Trans>
            )}
          </Text>
        </div>
        <CardLink href={billingAccountRoutes.detail(orgName, accountName)}>
          <Trans>Manage in billing account</Trans>
        </CardLink>
      </div>

      <BillingAccountHealthCards
        orgName={orgName}
        account={account}
        now={now}
        contract={contract}
        usageNotBilled={usageNotBilled}
      />

      <div className="grid grid-cols-1 items-start gap-4 @5xl/main:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Charges are acted on; prices are for reference, so they follow. */}
          <BillingAccountChargesCard orgName={orgName} account={account} readOnly />
          <SectionCard
            title={<Trans>Prices</Trans>}
            description={
              <Trans>
                What the account is billed for, by service. Open a service for its rates.
              </Trans>
            }>
            {entitlementQuery.isLoading || offerQuery.isLoading || pricingsQuery.isLoading ? (
              <Skeleton className="h-32 w-full rounded" />
            ) : offer ? (
              <AccountPriceList offer={offer} pricings={pricingsQuery.data?.items ?? []} />
            ) : (
              <CardMessage className="py-0">
                <Trans>The account has no offer yet, so it has no prices.</Trans>
              </CardMessage>
            )}
          </SectionCard>
        </div>
        <BillingAccountPlanCard orgName={orgName} account={account} now={now} readOnly />
      </div>
    </section>
  );
}
