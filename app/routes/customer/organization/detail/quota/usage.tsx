import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../../shared';
import type { Route } from './+types/usage';
import { QuotaBucketList } from '@/features/quota';
import {
  listOrgQuotaBuckets,
  orgQuotaGrantCreateMutation,
  orgQuotaGrantDeleteMutation,
  orgQuotaGrantListQuery,
} from '@/resources/request/client';
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

  return (
    <QuotaBucketList
      queryKeyPrefix={['organizations', orgName, 'buckets']}
      fetchFn={() => listOrgQuotaBuckets(orgName)}
      createGrantFn={(namespace, payload) =>
        orgQuotaGrantCreateMutation(orgName, namespace, payload)
      }
      fetchGrantsFn={() => orgQuotaGrantListQuery(orgName)}
      deleteGrantFn={(name, namespace) => orgQuotaGrantDeleteMutation(orgName, name, namespace)}
    />
  );
}
