import type { Route } from './+types/email-activity';
import { EmailList } from '@/features/email';
import { userEmailListQuery } from '@/resources/request/client';
import { getUserDetailMetadata, useUserDetailData } from '@/routes/user/shared';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const handle = {
  breadcrumb: () => <Trans>Email Activity</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { userName } = getUserDetailMetadata(matches);
  return metaObject(`Email Activity - ${userName}`);
};

export default function Page() {
  const data = useUserDetailData();

  return (
    <EmailList
      queryKeyPrefix={['users', data.metadata?.name ?? '', 'email-activity']}
      fetchFn={() => userEmailListQuery(data.metadata?.name ?? '', data.spec?.email ?? '')}
    />
  );
}
