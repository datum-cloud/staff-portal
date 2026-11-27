import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/usage';
import { QuotaBucketList } from '@/features/quota';
import {
  listProjectQuotaBuckets,
  projectQuotaGrantCreateMutation,
  projectQuotaGrantDeleteMutation,
  projectQuotaGrantListQuery,
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
  const projectName = project?.metadata?.name ?? '';

  return (
    <QuotaBucketList
      queryKeyPrefix={['projects', projectName, 'buckets']}
      fetchFn={() => listProjectQuotaBuckets(projectName)}
      createGrantFn={(namespace, payload) =>
        projectQuotaGrantCreateMutation(projectName, namespace, payload)
      }
      fetchGrantsFn={() => projectQuotaGrantListQuery(projectName)}
      deleteGrantFn={(name, namespace) =>
        projectQuotaGrantDeleteMutation(projectName, name, namespace)
      }
    />
  );
}
