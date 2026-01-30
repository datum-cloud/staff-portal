import type { Route } from './+types/index';
import { EmailList } from '@/features/email';
import { emailListQuery } from '@/resources/request/client';
import { routes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = ({ matches }) => {
  return metaObject('Email Activity');
};

export const handle = {
  breadcrumb: () => <Trans>Email Activity</Trans>,
};

export default function Page() {
  return (
    <EmailList
      queryKeyPrefix="emails"
      fetchFn={() => emailListQuery('milo-system', {})}
      detailPath={(namespace, emailName) => routes.emailActivity.detail(namespace, emailName)}
    />
  );
}
