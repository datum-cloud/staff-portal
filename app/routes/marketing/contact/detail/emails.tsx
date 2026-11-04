import { getContactDetailMetadata, useContactDetailData } from '../shared';
import type { Route } from './+types/emails';
import { isPlatformUser } from '@/features/contact';
import { EmailList } from '@/features/email';
import { userEmailListQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const handle = { breadcrumb: () => <Trans>Email Activity</Trans> };

export const meta: Route.MetaFunction = ({ matches }) => {
  const { contactName } = getContactDetailMetadata(matches);
  return metaObject(`Email Activity - ${contactName}`);
};

export default function Page() {
  const detail = useContactDetailData();
  const contact = detail.contact;
  const email = contact?.spec?.email ?? '';
  const userId = isPlatformUser(contact) ? (detail.user?.metadata?.name ?? '') : '';

  return (
    <EmailList
      variant="tab"
      queryKeyPrefix={['contact-emails', userId, email]}
      fetchFn={() => userEmailListQuery(userId, email)}
    />
  );
}
