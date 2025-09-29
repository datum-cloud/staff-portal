import { getProjectDetailMetadata, useProjectDetailData } from '../shared';
import type { Route } from './+types/quota';
import { QuotaGrantList } from '@/features/quota';
import { projectQuotaGrantListQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const handle = {
  breadcrumb: () => <Trans>Quotas</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Quotas - ${projectName}`);
};

export default function Page() {
  const { project } = useProjectDetailData();

  return (
    <QuotaGrantList
      queryKeyPrefix={['projects', project.metadata.name, 'quotas']}
      fetchFn={(params) => projectQuotaGrantListQuery(project.metadata.name, params)}
    />
  );
}
