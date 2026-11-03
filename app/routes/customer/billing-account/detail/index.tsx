import { getBillingAccountDetailMetadata, useBillingAccountDetailData } from '../shared';
import { PageHeader } from '@/components/page-header';
import {
  BillingAccountActivityCard,
  BillingAccountAttentionBanner,
  BillingAccountConfigCard,
  BillingAccountContactCard,
  BillingAccountHeader,
  BillingAccountHealthCards,
  BillingAccountInvoicesCard,
  BillingAccountOfferCard,
  BillingAccountPaymentCard,
  BillingAccountProjectsCard,
  BillingAccountUsageCard,
  usePaymentTerms,
  type BillingAccountHeaderAction,
} from '@/features/billing/components/billing-account-dashboard';
import { SectionCard } from '@/features/milo';
import { useEnv } from '@/hooks';
import {
  useBillingAccountDetailQuery,
  useBillingEntitlementForAccountQuery,
} from '@/resources/request/client';
import { billingAccountRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import { useState } from 'react';
import { useNavigate, type MetaFunction } from 'react-router';

export const meta: MetaFunction = ({ matches }) => {
  const { displayName } = getBillingAccountDetailMetadata(matches);
  return metaObject(displayName ? `${displayName} - Billing Account` : t`Billing Account`);
};

export default function Page() {
  const { account, orgName, orgDisplayName } = useBillingAccountDetailData();

  if (!account) {
    return (
      <div className="m-4">
        <PageHeader title={t`Billing Account`} />
        <SectionCard className="mt-4" contentClassName="py-6">
          <Text>
            <Trans>Billing account not found or you do not have permission to view it.</Trans>
          </Text>
        </SectionCard>
      </div>
    );
  }

  return (
    <Dashboard
      // A new account starts the cards afresh: meter choice, search, dialogs.
      key={account.metadata?.name}
      orgName={orgName}
      orgDisplayName={orgDisplayName}
      loaderAccount={account}
    />
  );
}

/**
 * The loader only fetched the account. Every card loads its own data on the
 * client, so the route change never waits on it.
 */
function Dashboard({
  orgName,
  orgDisplayName,
  loaderAccount,
}: {
  orgName: string;
  orgDisplayName: string;
  loaderAccount: ComMiloapisBillingV1Alpha1BillingAccount;
}) {
  const accountName = loaderAccount.metadata?.name ?? '';
  // Fixed for the page's life: the usage comparison's query key depends on it.
  const [now] = useState(() => new Date());
  const env = useEnv();
  const navigate = useNavigate();

  const accountQuery = useBillingAccountDetailQuery(orgName, accountName, loaderAccount);
  const account = accountQuery.data ?? loaderAccount;
  const cloudPortalUrl =
    env?.CLOUD_PORTAL_URL && orgName ? `${env.CLOUD_PORTAL_URL}/org/${orgName}/billing` : null;

  // Held here so the header's Actions menu can open the cards' dialogs.
  const paymentTerms = usePaymentTerms(orgName, account);
  const entitlementQuery = useBillingEntitlementForAccountQuery(orgName, accountName);
  const [switchOfferOpen, setSwitchOfferOpen] = useState(false);

  const pendingApplicationName = paymentTerms.pendingApplication?.metadata?.name;
  const headerActions: BillingAccountHeaderAction[] = [
    // While the customer's application waits, review it rather than grant terms.
    !paymentTerms.current && pendingApplicationName
      ? {
          key: 'payment-terms',
          label: <Trans>Review terms application</Trans>,
          onSelect: () =>
            navigate(billingAccountRoutes.applications.detail(orgName, pendingApplicationName)),
        }
      : paymentTerms.current
        ? {
            key: 'payment-terms',
            label: <Trans>Change payment terms</Trans>,
            disabled: paymentTerms.isLoading,
            onSelect: () => paymentTerms.dialogs.setChangeOpen(true),
          }
        : {
            key: 'payment-terms',
            label: <Trans>Grant payment terms</Trans>,
            disabled: paymentTerms.isLoading,
            onSelect: () => paymentTerms.dialogs.setGrantOpen(true),
          },
    {
      key: 'offer',
      label: <Trans>Switch offer</Trans>,
      // There's nothing to switch until the account has an entitlement.
      disabled: !entitlementQuery.data,
      onSelect: () => setSwitchOfferOpen(true),
    },
  ];

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

      <BillingAccountHealthCards orgName={orgName} account={account} now={now} />

      <div className="grid grid-cols-1 items-start gap-4 @5xl/main:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-4">
          <BillingAccountUsageCard orgName={orgName} account={account} now={now} />
          <BillingAccountInvoicesCard orgName={orgName} account={account} now={now} />
          <BillingAccountProjectsCard orgName={orgName} account={account} />
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <BillingAccountPaymentCard orgName={orgName} account={account} terms={paymentTerms} />
          <BillingAccountOfferCard
            orgName={orgName}
            accountName={accountName}
            switchOpen={switchOfferOpen}
            onSwitchOpenChange={setSwitchOfferOpen}
          />
          <BillingAccountContactCard account={account} />
          <BillingAccountConfigCard orgName={orgName} account={account} />
          <BillingAccountActivityCard orgName={orgName} />
        </aside>
      </div>
    </div>
  );
}
