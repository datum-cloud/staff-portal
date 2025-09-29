import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../shared';
import type { Route } from './+types/quota';
import { QuotaGrantList } from '@/features/quota';
import { orgQuotaGrantListQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const handle = {
  breadcrumb: () => <Trans>Quotas</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Quotas - ${organizationName}`);
};

export default function Page() {
  const data = useOrganizationDetailData();

  return (
    <QuotaGrantList
      queryKeyPrefix={['organizations', data.metadata.name, 'quotas']}
      fetchFn={(params) => orgQuotaGrantListQuery(data.metadata.name, params)}
    />
  );
}
