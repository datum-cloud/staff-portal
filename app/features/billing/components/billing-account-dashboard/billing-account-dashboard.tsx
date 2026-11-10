import { useBillingAccountHeaderActions } from '../../hooks/use-billing-account-header-actions';
import { getContractState } from '../../lib/contract';
import type { BillingAccount } from '../../utils';
import { usePaymentTerms } from '../payment-terms';
import { BillingAccountActivityCard } from './billing-account-activity-card';
import { BillingAccountAttentionBanner } from './billing-account-attention-banner';
import { BillingAccountContractCard } from './billing-account-contract-card';
import {
  BillingAccountConfigCard,
  BillingAccountContactCard,
} from './billing-account-details-cards';
import { BillingAccountHeader } from './billing-account-header';
import { BillingAccountHealthCards } from './billing-account-health-cards';
import { BillingAccountInvoicesCard } from './billing-account-invoices-card';
import { BillingAccountOfferCard } from './billing-account-offer-card';
import { BillingAccountPaymentCard } from './billing-account-payment-card';
import { BillingAccountProjectsCard } from './billing-account-projects-card';
import { BillingAccountUsageCard } from './billing-account-usage-card';
import { useEnv } from '@/hooks';
import {
  useBillingAccountDetailQuery,
  useBillingEntitlementForAccountQuery,
} from '@/resources/request/client';
import { cloudPortalUrls } from '@/utils/config/routes.config';
import { useMemo, useState } from 'react';

/**
 * The billing account page. The route loader only fetched the account;
 * every card loads its own data on the client, so the route change never
 * waits on it. Render with `key` set to the account name so moving to
 * another account starts the cards afresh.
 */
export function BillingAccountDashboard({
  orgName,
  orgDisplayName,
  loaderAccount,
}: {
  orgName: string;
  orgDisplayName: string;
  loaderAccount: BillingAccount;
}) {
  const accountName = loaderAccount.metadata?.name ?? '';
  // Fixed for the page's life, so every card measures from the same moment.
  const [now] = useState(() => new Date());
  const env = useEnv();

  const accountQuery = useBillingAccountDetailQuery(orgName, accountName, loaderAccount);
  const account = accountQuery.data ?? loaderAccount;
  const cloudPortalUrl = cloudPortalUrls.orgBilling(env?.CLOUD_PORTAL_URL, orgName);

  // Held here so the header's Actions menu can open the cards' dialogs.
  const paymentTerms = usePaymentTerms(orgName, account);
  const [switchOfferOpen, setSwitchOfferOpen] = useState(false);
  const entitlementQuery = useBillingEntitlementForAccountQuery(orgName, accountName);
  // A contract sets when the account is invoiced: its first invoice the day
  // it starts, then monthly on that day, whatever the payment terms say.
  const contract = useMemo(
    () => getContractState(entitlementQuery.data ?? null, now),
    [entitlementQuery.data, now]
  );
  const headerActions = useBillingAccountHeaderActions({
    orgName,
    account,
    paymentTerms,
    onSwitchOffer: () => setSwitchOfferOpen(true),
  });

  return (
    <div className="m-4 flex flex-col gap-4">
      <BillingAccountHeader
        orgName={orgName}
        orgDisplayName={orgDisplayName}
        account={account}
        cloudPortalUrl={cloudPortalUrl}
        actions={headerActions}
      />

      <BillingAccountAttentionBanner
        orgName={orgName}
        account={account}
        cloudPortalUrl={cloudPortalUrl}
        now={now}
      />

      <BillingAccountHealthCards
        orgName={orgName}
        account={account}
        now={now}
        contract={contract}
      />

      {/*
        Two columns when wide: usage, invoices and projects, then the activity
        feed, beside the account's details. The feed sits in the wide column
        so a quiet account's page isn't one long narrow column of cards; the
        details span both rows, and the second row is the flexible one, so
        their height never pushes the feed down. In one column the feed
        comes last, after the details.
      */}
      <div className="grid grid-cols-1 items-start gap-4 @5xl/main:grid-cols-[minmax(0,1fr)_400px] @5xl/main:grid-rows-[auto_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <BillingAccountUsageCard
            orgName={orgName}
            account={account}
            now={now}
            contract={contract}
          />
          <BillingAccountInvoicesCard
            orgName={orgName}
            account={account}
            now={now}
            contract={contract}
          />
          <BillingAccountProjectsCard orgName={orgName} account={account} />
        </div>

        <aside className="flex min-w-0 flex-col gap-4 @5xl/main:row-span-2">
          <BillingAccountPaymentCard orgName={orgName} account={account} terms={paymentTerms} />
          <BillingAccountContractCard
            orgName={orgName}
            account={account}
            entitlement={entitlementQuery.data ?? null}
            now={now}
          />
          <BillingAccountOfferCard
            orgName={orgName}
            account={account}
            switchOpen={switchOfferOpen}
            onSwitchOpenChange={setSwitchOfferOpen}
          />
          <BillingAccountContactCard account={account} />
          <BillingAccountConfigCard orgName={orgName} account={account} contract={contract} />
        </aside>

        <div className="min-w-0 @5xl/main:col-start-1">
          <BillingAccountActivityCard orgName={orgName} />
        </div>
      </div>
    </div>
  );
}
