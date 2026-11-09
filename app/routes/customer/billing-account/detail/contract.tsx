import { getBillingAccountDetailMetadata, useBillingAccountDetailData } from '../shared';
import { PageHeader } from '@/components/page-header';
import { ContractEditor } from '@/features/billing';
import { SectionCard } from '@/features/milo';
import { metaObject } from '@/utils/helpers';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { type MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Contract</Trans>,
};

export const meta: MetaFunction = ({ matches }) => {
  const { displayName } = getBillingAccountDetailMetadata(matches);
  return metaObject(displayName ? `${displayName} - Contract` : t`Contract`);
};

export default function Page() {
  const { account, orgName } = useBillingAccountDetailData();

  if (!account) {
    return (
      <div className="m-4">
        <PageHeader title={t`Contract`} />
        <SectionCard className="mt-4" contentClassName="py-6">
          <Text>
            <Trans>Billing account not found or you do not have permission to view it.</Trans>
          </Text>
        </SectionCard>
      </div>
    );
  }

  return <ContractEditor key={account.metadata?.name} orgName={orgName} account={account} />;
}
