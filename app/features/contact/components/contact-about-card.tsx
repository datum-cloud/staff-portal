import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { SectionCard } from '@/features/milo';
import { Trans } from '@lingui/react/macro';
import { ComMiloapisNotificationV1Alpha1Contact } from '@openapi/notification.miloapis.com/v1alpha1';

type Props = {
  contact?: ComMiloapisNotificationV1Alpha1Contact;
  className?: string;
};

/**
 * Read-only "About" card: the contact's own fields. The Edit action + dialog
 * land with #760.
 */
export function ContactAboutCard({ contact, className }: Props) {
  return (
    <SectionCard title={<Trans>About</Trans>} className={className}>
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
