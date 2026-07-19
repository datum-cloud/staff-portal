import { DescriptionList } from '@/components/description-list';
import { formatBillingAddress } from '@/features/billing/utils';
import { SectionCard } from '@/features/milo';
import type { GqlOrganization } from '@/modules/graphql/organizations';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import type { ComMiloapisResourcemanagerV1Alpha1Organization } from '@openapi/resourcemanager.miloapis.com/v1alpha1';

type Address = NonNullable<
  NonNullable<ComMiloapisResourcemanagerV1Alpha1Organization['spec']>['contactInfo']
>['address'];

function resolveAddress(
  k8sOrg: ComMiloapisResourcemanagerV1Alpha1Organization | undefined,
  billingAccounts: ComMiloapisBillingV1Alpha1BillingAccount[]
): Address | undefined {
  const orgAddress = k8sOrg?.spec?.contactInfo?.address;
  if (orgAddress && (orgAddress.line1 || orgAddress.city || orgAddress.country)) {
    return orgAddress;
  }

  const ready =
    billingAccounts.find((account) => account.status?.phase === 'Ready') ?? billingAccounts[0];
  return ready?.spec?.contactInfo?.address;
}

type Props = {
  org: GqlOrganization | null | undefined;
  k8sOrg: ComMiloapisResourcemanagerV1Alpha1Organization | undefined;
  billingAccounts: ComMiloapisBillingV1Alpha1BillingAccount[];
  isLoading?: boolean;
  className?: string;
};

export function OrgContactCard({ org, k8sOrg, billingAccounts, isLoading, className }: Props) {
  const contact = org?.contactInfo;
  const company = contact?.businessName?.trim() || null;
  const name = contact?.name?.trim() || k8sOrg?.spec?.contactInfo?.name?.trim() || null;
  const email = contact?.email?.trim() || k8sOrg?.spec?.contactInfo?.email?.trim() || null;
  const address = resolveAddress(k8sOrg, billingAccounts);
  const addressText = formatBillingAddress(address);

  const isEmpty = !company && !name && !email && !addressText;

  return (
    <SectionCard className={cn(className)} title={<Trans>Contact details</Trans>}>
      {isLoading ? (
        <Text size="sm" textColor="muted">
          <Trans>Loading contact details…</Trans>
        </Text>
      ) : isEmpty ? (
        <Text size="sm" textColor="muted">
          <Trans>No contact details on file. Onboarding may be waiting on this step.</Trans>
        </Text>
      ) : (
        <DescriptionList
          items={[
            {
              label: <Trans>Company / legal name</Trans>,
              value: <Text>{company || '—'}</Text>,
            },
            {
              label: <Trans>Contact name</Trans>,
              value: <Text>{name || '—'}</Text>,
            },
            {
              label: <Trans>Email</Trans>,
              value: <Text>{email || '—'}</Text>,
            },
            {
              label: <Trans>Address</Trans>,
              value: addressText ? (
                <Text className="whitespace-pre-line">{addressText}</Text>
              ) : (
                <Text>—</Text>
              ),
            },
          ]}
        />
      )}
    </SectionCard>
  );
}
