import { getSuspendedProjectDetailMetadata, useSuspendedProjectDetailData } from '../shared';
import type { Route } from './+types/index';
import { ProjectSuspensionCard } from '@/features/project';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getSuspendedProjectDetailMetadata(matches);
  return metaObject(`Suspended - ${projectName}`);
};

export const handle = {
  breadcrumb: () => <Trans>Overview</Trans>,
};

export default function Page() {
  const project = useSuspendedProjectDetailData();

  // Lists every suspension on the project (each liftable) plus lifted history —
  // the same card used on the project detail overview (#575).
  return (
    <div className="m-4">
      <ProjectSuspensionCard project={project} />
    </div>
  );
}
