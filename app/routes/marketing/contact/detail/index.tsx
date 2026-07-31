import { getContactDetailMetadata, useContactDetailData } from '../shared';
import type { Route } from './+types/index';
import { ContactForm, ContactOrganizationsCard } from '@/features/contact';
import { SectionCard } from '@/features/milo';
import { NotesCard } from '@/features/notes';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { contactName } = getContactDetailMetadata(matches);
  return metaObject(`Details - ${contactName}`);
};

export default function Page() {
  const data = useContactDetailData();
  const namespace = data?.contact?.metadata?.namespace ?? 'default';
  const contactName = data?.contact?.metadata?.name ?? '';
  const userId = data?.user?.metadata?.name ?? '';

  return (
    <div className="m-4 flex flex-col gap-4">
      <SectionCard title={<Trans>Contact Information</Trans>}>
        <ContactForm contact={data?.contact} user={data?.user} />
      </SectionCard>

      <ContactOrganizationsCard userId={userId} />

      <NotesCard
        subject={{
          apiGroup: 'notification.miloapis.com',
          kind: 'Contact',
          name: contactName,
          namespace,
        }}
      />
    </div>
  );
}
