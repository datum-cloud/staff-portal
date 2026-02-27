import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/usage';
import { QuotaBucketList } from '@/features/quota';
import {
  projectQuotaBucketListQuery,
  projectQuotaGrantCreateMutation,
} from '@/resources/request/client';
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

  return (
    <QuotaBucketList
      queryKeyPrefix={['projects', project?.metadata?.name ?? '', 'buckets']}
      fetchFn={(params) => projectQuotaBucketListQuery(project?.metadata?.name ?? '', params)}
      createGrantFn={(namespace, payload) =>
        projectQuotaGrantCreateMutation(project?.metadata?.name ?? '', namespace, payload)
      }
    />
  );
}
