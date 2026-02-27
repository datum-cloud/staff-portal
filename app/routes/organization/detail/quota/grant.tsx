import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../../shared';
import type { Route } from './+types/grant';
import { QuotaGrantList } from '@/features/quota';
import { orgQuotaGrantDeleteMutation, orgQuotaGrantListQuery } from '@/resources/request/client';
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

  return (
    <QuotaGrantList
      queryKeyPrefix={['organizations', data.metadata?.name ?? '', 'grants']}
      fetchFn={(params) => orgQuotaGrantListQuery(data.metadata?.name ?? '', params)}
      deleteGrantFn={(name, namespace) =>
        orgQuotaGrantDeleteMutation(data.metadata?.name ?? '', name, namespace)
      }
    />
  );
}
