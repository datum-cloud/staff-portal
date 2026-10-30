import type { Route } from './+types/index';
import { EmailList } from '@/features/email';
import { ListPage } from '@/features/milo';
import { emailListQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';

export const meta: Route.MetaFunction = () => {
  return metaObject('Email Activity');
};

export default function Page() {
  return (
    <ListPage>
      <EmailList
        queryKeyPrefix="emails"
        fetchFn={({ signal }) => emailListQuery('milo-system', signal)}
      />
    </ListPage>
  );
}
