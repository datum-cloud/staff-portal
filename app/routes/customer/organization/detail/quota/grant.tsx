import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../../shared';
import type { Route } from './+types/grant';
import { QuotaGrantList } from '@/features/quota';
import {
  listOrgQuotaGrants,
  quotaQueryKeys,
  useOrgQuotaGrantDeleteMutation,
  useOrgQuotaGrantListQuery,
} from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const handle = {
  breadcrumb: () => <Trans>Grants</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Grants - ${organizationName}`);
};

export default function Page() {
  const data = useOrganizationDetailData();
  const orgName = data.metadata?.name ?? '';
  const grantsQuery = useOrgQuotaGrantListQuery(orgName);
  const deleteMutation = useOrgQuotaGrantDeleteMutation();

  return (
    <QuotaGrantList
      queryKeyPrefix={[...quotaQueryKeys.organizations.grants.all(orgName), 'gql']}
      fetchFn={() => listOrgQuotaGrants(orgName)}
      deleteGrantFn={(name, namespace) => deleteMutation.mutateAsync({ orgName, name, namespace })}
      resourceGrants={grantsQuery.data?.items}
    />
  );
}
