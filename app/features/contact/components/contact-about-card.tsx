import { EditContactDialog } from './edit-contact-dialog';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { SectionCard } from '@/features/milo';
import { Trans } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { ComMiloapisNotificationV1Alpha1Contact } from '@openapi/notification.miloapis.com/v1alpha1';

type Props = {
  contact?: ComMiloapisNotificationV1Alpha1Contact;
  user?: ComMiloapisIamV1Alpha1User;
  className?: string;
};

/**
 * Read-only "About" card: the contact's own fields. Edit opens the contact form
 * in a dialog (#760).
 */
export function ContactAboutCard({ contact, user, className }: Props) {
  return (
    <SectionCard
      title={<Trans>About</Trans>}
      action={<EditContactDialog contact={contact} user={user} variant="card" />}
      className={className}>
      <DescriptionList
        labelWidth="40%"
        items={[
          { label: <Trans>First name</Trans>, value: contact?.spec?.givenName || '—' },
          { label: <Trans>Last name</Trans>, value: contact?.spec?.familyName || '—' },
          { label: <Trans>Email</Trans>, value: contact?.spec?.email || '—' },
          {
            label: <Trans>Created</Trans>,
            value: contact?.metadata?.creationTimestamp ? (
              <DateTime date={contact.metadata.creationTimestamp} />
            ) : (
              '—'
            ),
          },
          { label: <Trans>Resource</Trans>, value: contact?.metadata?.name || '—' },
        ]}
      />
    </SectionCard>
  );
}
