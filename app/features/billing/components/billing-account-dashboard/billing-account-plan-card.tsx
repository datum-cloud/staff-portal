import type { BillingAccount } from '../../utils';
import { BillingAccountContractCard } from './billing-account-contract-card';
import { BillingAccountContractDraftCard } from './billing-account-contract-draft-card';
import { BillingAccountOfferCard } from './billing-account-offer-card';
import { SectionCard } from '@/features/milo';
import { useBillingEntitlementForAccountQuery } from '@/resources/request/client';
import { Trans } from '@lingui/react/macro';

const noop = () => {};

/**
 * What the account is on, as parts of one card: its contract, a draft of
 * one, or its offer. The switch offer dialog and the next-invoice preview
 * live in its parts, and are opened by whoever renders the card.
 */
export function BillingAccountPlanCard({
  orgName,
  account,
  now,
  switchOfferOpen = false,
  onSwitchOfferOpenChange = noop,
  previewOpen = false,
  onPreviewOpenChange = noop,
  readOnly = false,
}: {
  orgName: string;
  account: BillingAccount;
  now: Date;
  switchOfferOpen?: boolean;
  onSwitchOfferOpenChange?: (open: boolean) => void;
  previewOpen?: boolean;
  onPreviewOpenChange?: (open: boolean) => void;
  /** Shows the plan with nothing to change it, as the organization's billing page does. */
  readOnly?: boolean;
}) {
  const entitlementQuery = useBillingEntitlementForAccountQuery(
    orgName,
    account.metadata?.name ?? ''
  );
  const entitlement = entitlementQuery.data ?? null;
  return (
    <SectionCard
      title={<Trans>Plan</Trans>}
      contentClassName="flex flex-col divide-y pt-1 [&>*]:py-3 [&>*:last-child]:pb-0">
      <BillingAccountContractCard
        orgName={orgName}
        account={account}
        entitlement={entitlement}
        now={now}
        previewOpen={previewOpen}
        onPreviewOpenChange={onPreviewOpenChange}
        readOnly={readOnly}
      />
      <BillingAccountContractDraftCard
        orgName={orgName}
        account={account}
        entitlement={entitlement}
        now={now}
        readOnly={readOnly}
      />
      <BillingAccountOfferCard
        orgName={orgName}
        account={account}
        switchOpen={switchOfferOpen}
        onSwitchOpenChange={onSwitchOfferOpenChange}
        readOnly={readOnly}
      />
    </SectionCard>
  );
}
