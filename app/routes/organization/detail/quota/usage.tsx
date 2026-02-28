import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../../shared';
import type { Route } from './+types/usage';
import { QuotaBucketList } from '@/features/quota';
import { orgQuotaBucketListQuery, orgQuotaGrantCreateMutation } from '@/resources/request/client';
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

  return (
    <QuotaBucketList
      queryKeyPrefix={['organizations', data.metadata?.name ?? '', 'buckets']}
      fetchFn={(params) => orgQuotaBucketListQuery(data.metadata?.name ?? '', params)}
      createGrantFn={(namespace, payload) =>
        orgQuotaGrantCreateMutation(data.metadata?.name ?? '', namespace, payload)
      }
    />
  );
}
