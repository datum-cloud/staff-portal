import type { Route } from './+types/create';
import { Project } from '@/resources/schemas/project.schema';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { useRouteLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<Project>(matches, 'routes/project/detail/layout');
  return metaObject(`HTTPProxy - ${data?.metadata?.name}`);
};

export const handle = {
  breadcrumb: () => <Trans>Create</Trans>,
};

export default function Page() {
  const data = useRouteLoaderData('routes/project/detail/layout') as Project;

  return <>HttpProxy Create</>;
}
