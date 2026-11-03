import { formatBillingAddress, getBillingAccountDisplayStatus } from '../../utils';
import { frequencyLabel } from './card-parts';
import { useAccountPaymentMethods } from './use-account-dashboard';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { SectionCard } from '@/features/milo';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';

type BillingAccount = ComMiloapisBillingV1Alpha1BillingAccount;

const NotProvided = () => (
  <Text textColor="muted">
    <Trans>Not provided</Trans>
  </Text>
);

/** Who receives billing mail, and the address and tax IDs on invoices. */
export function BillingAccountContactCard({ account }: { account: BillingAccount }) {
  const contactInfo = account.spec?.contactInfo;
  const address = formatBillingAddress(contactInfo?.address);
  const taxIds = account.spec?.taxIds ?? [];

  return (
    <SectionCard title={<Trans>Billing contact</Trans>}>
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
    </SectionCard>
  );
}

/** The account's status, currency and invoicing settings. */
export function BillingAccountConfigCard({
  orgName,
  account,
}: {
  orgName: string;
  account: BillingAccount;
}) {
  const { paymentMethods, isLoading } = useAccountPaymentMethods(orgName, account);
  const status = getBillingAccountDisplayStatus(account, paymentMethods ?? []);
  const terms = account.spec?.paymentTerms;
  const frequency = frequencyLabel(terms?.invoiceFrequency);
  const invoiceDay = terms?.invoiceDayOfMonth ?? 1;

  return (
    <SectionCard title={<Trans>Configuration</Trans>}>
      <DescriptionList
        items={[
          {
            label: <Trans>Status</Trans>,
            value: isLoading ? (
              <Skeleton className="h-4 w-14 rounded" />
            ) : (
              <BadgeState state={status.state} tooltip={status.tooltip} />
            ),
          },
          {
            label: <Trans>Currency</Trans>,
            value: <Text>{account.spec?.currencyCode ?? '—'}</Text>,
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
            value: <Text>{terms?.netDays ?? '—'}</Text>,
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
