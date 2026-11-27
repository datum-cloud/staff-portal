import { getContractState } from '../../lib/contract';
import { getBillingAccountDisplayName, type BillingAccount } from '../../utils';
import { BillingAccountActivityCard } from './billing-account-activity-card';
import { BillingAccountChargesCard } from './billing-account-charges-card';
import { BillingAccountInvoicesCard } from './billing-account-invoices-card';
import { PageHeader } from '@/components/page-header';
import { useBillingEntitlementForAccountQuery } from '@/resources/request/client';
import { t } from '@lingui/core/macro';
import { useMemo, useState } from 'react';

export type BillingAccountSection = 'invoices' | 'charges' | 'activity';

/**
 * One of the account's sections on a page of its own, reached from the left
 * rail: every invoice, its charges, or its activity. The overview shows the
 * start of each; these have room for all of it.
 */
export function BillingAccountSectionPage({
  orgName,
  account,
  section,
}: {
  orgName: string;
  account: BillingAccount;
  section: BillingAccountSection;
}) {
  const accountName = account.metadata?.name ?? '';
  // Fixed for the page's life, as on the overview.
  const [now] = useState(() => new Date());
  const entitlementQuery = useBillingEntitlementForAccountQuery(orgName, accountName);
  const contract = useMemo(
    () => getContractState(entitlementQuery.data ?? null, now),
    [entitlementQuery.data, now]
  );
  const [addingCharge, setAddingCharge] = useState(false);
  const name = getBillingAccountDisplayName(account);
  const title =
    section === 'invoices'
      ? t`${name} invoices`
      : section === 'charges'
        ? t`${name} charges`
        : t`${name} activity`;

  return (
    <div className="m-4 flex flex-col gap-4">
      <PageHeader title={title} />
      {section === 'invoices' ? (
        <BillingAccountInvoicesCard
          orgName={orgName}
          account={account}
          now={now}
          contract={contract}
          full
        />
      ) : section === 'charges' ? (
        <BillingAccountChargesCard
          orgName={orgName}
          account={account}
          adding={addingCharge}
          onAddingChange={setAddingCharge}
        />
      ) : (
        <BillingAccountActivityCard orgName={orgName} accountName={accountName} full />
      )}
    </div>
  );
}
