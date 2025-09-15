import type { Route } from './+types/email-activity';
import { useDataTableQuery } from '@/modules/datum-ui/data-table';
import { projectEmailActivityListQuery } from '@/resources/request/client';
import { getProjectDetailMetadata, useProjectDetailData } from '@/routes/project/shared';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Email Activity - ${projectName}`);
};

export const handle = {
  breadcrumb: () => <Trans>Email Activity</Trans>,
};

export default function Page() {
  const { project } = useProjectDetailData();

  const tableState = useDataTableQuery({
    queryKeyPrefix: ['projects', project.metadata.name, 'email-activity'],
    fetchFn: (params) => projectEmailActivityListQuery(project.metadata.name, params),
    useSorting: true,
  });

  return <>Email Activity</>;
}
