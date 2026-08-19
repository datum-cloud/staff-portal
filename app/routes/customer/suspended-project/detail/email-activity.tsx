import { getSuspendedProjectDetailMetadata, useSuspendedProjectDetailData } from '../shared';
import type { Route } from './+types/email-activity';
import { EmailList } from '@/features/email';
import { projectSuspensionWarningEmailListQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getSuspendedProjectDetailMetadata(matches);
  return metaObject(`Email Activity - ${projectName}`);
};

export const handle = {
  breadcrumb: () => <Trans>Email Activity</Trans>,
};

export default function Page() {
  const project = useSuspendedProjectDetailData();
  const projectName = project?.metadata?.name ?? '';

  // The deletion-warning emails are per project (labeled by project name), so both
  // of a project's suspensions surface the same list. Delivery status per email
  // comes from the Email's `Delivered` condition, rendered by EmailList.
  return (
    <EmailList
      queryKeyPrefix={['suspended-projects', projectName, 'warning-emails']}
      fetchFn={() => projectSuspensionWarningEmailListQuery(projectName)}
      variant="tab"
    />
  );
}
