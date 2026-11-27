import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../../shared';
import type { Route } from './+types/usage';
import { QuotaBucketList, useOrgQuotaLimitChange } from '@/features/quota';
import { listOrgQuotaBuckets, quotaQueryKeys } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const handle = {
  breadcrumb: () => <Trans>Usage</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Usage - ${organizationName}`);
};

export default function Page() {
  const data = useOrganizationDetailData();
  const orgName = data.metadata?.name ?? '';
  const limitChange = useOrgQuotaLimitChange(orgName);

  return (
    <QuotaBucketList
      queryKeyPrefix={[...quotaQueryKeys.organizations.buckets.all(orgName), 'gql']}
      fetchFn={() => listOrgQuotaBuckets(orgName)}
      resourceGrants={limitChange.resourceGrants}
      grantsError={limitChange.isError}
      changeLimitFn={limitChange.changeLimit}
    />
  );
}
