import { billingCycleTerms, type ContractState } from '../../lib/contract';
import {
  formatBillingAddress,
  getAccountCurrency,
  getEffectiveNetDays,
  type BillingAccount,
} from '../../utils';
import { EditContactDialog } from '../billing-contact/edit-contact-dialog';
import { AccountStatusBadge } from './account-status-badge';
import { frequencyLabel } from './card-parts';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { SectionCard } from '@/features/milo';
import { resolveCycleTerms } from '@/modules/billing/billing-cycle';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';

const NotProvided = () => (
  <Text textColor="muted">
    <Trans>Not provided</Trans>
  </Text>
);

/**
 * Who receives billing mail, and the address and tax IDs on invoices. Staff
 * can edit them, for when the customer can't.
 */
export function BillingAccountContactCard({
  orgName,
  account,
}: {
  orgName: string;
  account: BillingAccount;
}) {
  const contactInfo = account.spec?.contactInfo;
  const address = formatBillingAddress(contactInfo?.address);
  const taxIds = account.spec?.taxIds ?? [];
  const [editing, setEditing] = useState(false);

  return (
    <SectionCard
      title={<Trans>Billing contact</Trans>}
      action={
        <Button
          type="quaternary"
          theme="borderless"
          size="small"
          icon={<Icon icon={ACTION_ICONS.edit} size={14} />}
          iconPosition="right"
          onClick={() => setEditing(true)}
          data-e2e="billing-contact-edit">
          <Trans>Edit</Trans>
        </Button>
      }>
      <DescriptionList
        items={[
          {
            label: <Trans>Contact</Trans>,
            value: contactInfo?.name ? <Text>{contactInfo.name}</Text> : <NotProvided />,
          },
          {
            label: <Trans>Company</Trans>,
            value: contactInfo?.businessName ? (
              <Text>{contactInfo.businessName}</Text>
            ) : (
              <NotProvided />
            ),
          },
          {
            label: <Trans>Email</Trans>,
            value: contactInfo?.email ? (
              <Text className="break-all">{contactInfo.email}</Text>
            ) : (
              <NotProvided />
            ),
          },
          {
            label: <Trans>Invoice recipients</Trans>,
            value: contactInfo?.invoiceEmails?.length ? (
              <Text className="break-all">{contactInfo.invoiceEmails.join(', ')}</Text>
            ) : (
              <NotProvided />
            ),
          },
          {
            label: <Trans>Billing address</Trans>,
            value: address ? (
              <Text className="whitespace-pre-line">{address}</Text>
            ) : (
              <NotProvided />
            ),
          },
          {
            label: <Trans>Tax IDs</Trans>,
            value: taxIds.length ? (
              <Text>
                {taxIds
                  .map(
                    (taxId: { type?: string; value?: string }) => `${taxId.type}: ${taxId.value}`
                  )
                  .join(', ')}
              </Text>
            ) : (
              <NotProvided />
            ),
          },
        ]}
      />
      {editing ? (
        <EditContactDialog orgName={orgName} account={account} onClose={() => setEditing(false)} />
      ) : null}
    </SectionCard>
  );
}

/** The account's status, currency and invoicing settings. */
export function BillingAccountConfigCard({
  orgName,
  account,
  contract,
}: {
  orgName: string;
  account: BillingAccount;
  /** The account's contract, which sets its billing day once it starts. */
  contract?: ContractState | null;
}) {
  const terms = billingCycleTerms(account.spec?.paymentTerms, contract);
  const netDays = getEffectiveNetDays(account);
  const cycle = resolveCycleTerms(terms);
  const frequency = frequencyLabel(cycle.frequency);
  const invoiceDay = cycle.invoiceDay;

  return (
    <SectionCard title={<Trans>Configuration</Trans>}>
      <DescriptionList
        items={[
          {
            label: <Trans>Status</Trans>,
            value: <AccountStatusBadge orgName={orgName} account={account} />,
          },
          {
            label: <Trans>Currency</Trans>,
            value: <Text>{getAccountCurrency(account)}</Text>,
          },
          {
            label: <Trans>Invoice frequency</Trans>,
            value: (
              <Text>
                <Trans>
                  {frequency}, on day {invoiceDay}
                </Trans>
              </Text>
            ),
          },
          {
            label: <Trans>Net days</Trans>,
            value: <Text>{netDays ?? '—'}</Text>,
          },
          {
            label: <Trans>Created</Trans>,
            value: <DateTime date={account.metadata?.creationTimestamp} variant="both" />,
          },
        ]}
      />
    </SectionCard>
  );
}
