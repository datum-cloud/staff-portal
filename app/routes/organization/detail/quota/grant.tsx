import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../../shared';
import type { Route } from './+types/grant';
import { QuotaGrantList } from '@/features/quota';
import { listOrgQuotaGrants } from '@/modules/graphql/quota';
import { orgQuotaGrantDeleteMutation } from '@/resources/request/client';
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
      fetchFn={() => listOrgQuotaGrants(data.metadata?.name ?? '')}
      deleteGrantFn={(name, namespace) =>
        orgQuotaGrantDeleteMutation(data.metadata?.name ?? '', name, namespace)
      }
    />
  );
}
