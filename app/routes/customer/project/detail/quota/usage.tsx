import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/usage';
import { QuotaBucketList } from '@/features/quota';
import { listProjectQuotaBuckets, quotaQueryKeys } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const handle = {
  breadcrumb: () => <Trans>Usage</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Usage - ${projectName}`);
};

export default function Page() {
  const { project } = useProjectDetailData();
  const projectName = project?.metadata?.name ?? '';

  return (
    <QuotaBucketList
      queryKeyPrefix={[...quotaQueryKeys.projects.buckets.all(projectName), 'gql']}
      fetchFn={() => listProjectQuotaBuckets(projectName)}
      consumer={{ kind: 'Project', name: projectName }}
    />
  );
}
