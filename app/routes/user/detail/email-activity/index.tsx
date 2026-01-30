import type { Route } from './+types/index';
import { EmailList } from '@/features/email';
import { userEmailListQuery } from '@/resources/request/client';
import { getUserDetailMetadata, useUserDetailData } from '@/routes/user/shared';
import { userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';

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
      detailPath={(namespace, emailName) =>
        userRoutes.emailActivity.detail(data.metadata?.name ?? '', namespace, emailName)
      }
    />
  );
}
