import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/grant';
import { QuotaGrantList } from '@/features/quota';
import { listProjectQuotaGrants } from '@/modules/graphql/quota';
import { projectQuotaGrantDeleteMutation } from '@/resources/request/client';
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
      fetchFn={() => listProjectQuotaGrants(project?.metadata?.name ?? '')}
      deleteGrantFn={(name, namespace) =>
        projectQuotaGrantDeleteMutation(project?.metadata?.name ?? '', name, namespace)
      }
    />
  );
}
