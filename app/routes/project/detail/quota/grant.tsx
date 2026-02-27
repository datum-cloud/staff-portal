import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/grant';
import { QuotaGrantList } from '@/features/quota';
import {
  projectQuotaGrantDeleteMutation,
  projectQuotaGrantListQuery,
} from '@/resources/request/client';
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

  return (
    <QuotaGrantList
      queryKeyPrefix={['projects', project?.metadata?.name ?? '', 'grants']}
      fetchFn={(params) => projectQuotaGrantListQuery(project?.metadata?.name ?? '', params)}
      deleteGrantFn={(name, namespace) =>
        projectQuotaGrantDeleteMutation(project?.metadata?.name ?? '', name, namespace)
      }
    />
  );
}
