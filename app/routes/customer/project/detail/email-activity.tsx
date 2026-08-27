import { EmailList } from '@/features/email';
import { projectSuspensionWarningEmailListQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Email Activity</Trans>,
};

export const meta = () => metaObject('Email Activity');

export default function Page() {
  const { projectName = '' } = useParams();

  // The suspension deletion-warning emails are per project (labeled by project
  // name). Delivery status per email comes from the Email's `Delivered`
  // condition, rendered by EmailList. Empty for projects with no warnings.
  return (
    <EmailList
      queryKeyPrefix={['projects', projectName, 'warning-emails']}
      fetchFn={() => projectSuspensionWarningEmailListQuery(projectName)}
      variant="tab"
    />
  );
}
