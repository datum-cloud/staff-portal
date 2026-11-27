import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/grant';
import { QuotaGrantList } from '@/features/quota';
import { listProjectQuotaGrants, quotaQueryKeys } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const handle = {
  breadcrumb: () => <Trans>Grants</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Grants - ${projectName}`);
};

export default function Page() {
  const { project } = useProjectDetailData();
  const projectName = project?.metadata?.name ?? '';

  return (
    <QuotaGrantList
      queryKeyPrefix={[...quotaQueryKeys.projects.grants.all(projectName), 'gql']}
      fetchFn={() => listProjectQuotaGrants(projectName)}
      consumer={{ kind: 'Project', name: projectName }}
    />
  );
}
