import type { Route } from './+types/contacts';
import { ContactList } from '@/features/contact';
import { contactListQuery } from '@/resources/request/client';
import { getUserDetailMetadata, useUserDetailData } from '@/routes/user/shared';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const handle = {
  breadcrumb: () => <Trans>Contacts</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { userName } = getUserDetailMetadata(matches);
  return metaObject(`Contacts - ${userName}`);
};

export default function Page() {
  const data = useUserDetailData();
  const userId = data.metadata?.name ?? '';

  return (
    <ContactList
      queryKeyPrefix={['users', userId, 'contacts']}
      fetchFn={() =>
        contactListQuery({
          filters: { fieldSelector: `spec.subject.name=${userId}` },
        })
      }
    />
  );
}
