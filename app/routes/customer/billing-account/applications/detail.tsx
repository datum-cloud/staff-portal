import { ApplicationReview } from '@/features/billing';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import { useParams, type MetaFunction } from 'react-router';

function ApplicationBreadcrumb() {
  const { applicationName } = useParams<{ applicationName: string }>();
  return <span>{applicationName ?? ''}</span>;
}

export const handle = {
  // The breadcrumb is called with `match.data`, not params, so read the
  // param through the router.
  breadcrumb: () => <ApplicationBreadcrumb />,
};

export const meta: MetaFunction = () => metaObject(t`Payment Terms Application`);

export default function Page() {
  const { orgName = '', applicationName = '' } = useParams();
  return <ApplicationReview orgName={orgName} applicationName={applicationName} />;
}
