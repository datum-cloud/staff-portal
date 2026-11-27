import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../shared';
import type { Route } from './+types/billing';
import { PageHeader } from '@/components/page-header';
import { OrgBillingOverview } from '@/features/billing';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';

export const handle = {
  breadcrumb: () => <Trans>Billing</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Billing - ${organizationName}`);
};

export default function Page() {
  const data = useOrganizationDetailData();
  const orgName = data?.metadata?.name ?? '';

  return (
    <div className="m-4 flex flex-col gap-4">
      <PageHeader
        title={t`Billing`}
        description={t`What this organization pays for, at what prices, and what it owes.`}
      />
      <OrgBillingOverview key={orgName} orgName={orgName} />
    </div>
  );
}
