import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../shared';
import type { Route } from './+types/domain';
import { DomainList, useOrgDomainList } from '@/features/domain';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const handle = {
  breadcrumb: () => <Trans>Domains</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Domains - ${organizationName}`);
};

export default function Page() {
  const data = useOrganizationDetailData();
  const orgName = data?.metadata?.name ?? '';
  const { rows, isLoading } = useOrgDomainList(orgName);

  return (
    <DomainList
      data={rows}
      loading={isLoading}
      showProjectColumn
      linkBuilder={(row) =>
        projectRoutes.domain.detail(
          row.projectName,
          row.domain.metadata?.namespace ?? '',
          row.domain.metadata?.name ?? ''
        )
      }
    />
  );
}
