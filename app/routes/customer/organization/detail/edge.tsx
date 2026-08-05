import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../shared';
import type { Route } from './+types/edge';
import { EdgeList, useOrgEdgeList } from '@/features/edge';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const handle = {
  breadcrumb: () => <Trans>ALB</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Application Load Balancer - ${organizationName}`);
};

export default function Page() {
  const data = useOrganizationDetailData();
  const orgName = data?.metadata?.name ?? '';
  const { rows, isLoading } = useOrgEdgeList(orgName);

  return (
    <EdgeList
      data={rows}
      loading={isLoading}
      showProjectColumn
      linkBuilder={(row) =>
        projectRoutes.edge.detail(row.projectName, row.edge.metadata?.name ?? '')
      }
    />
  );
}
