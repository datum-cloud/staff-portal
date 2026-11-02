import { isPlatformUser } from '../lib/contact-user-link';
import { BadgeState } from '@/components/badge';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisNotificationV1Alpha1Contact } from '@openapi/notification.miloapis.com/v1alpha1';
import { CircleUserRound, UserPlus } from 'lucide-react';

type Props = {
  contact?: ComMiloapisNotificationV1Alpha1Contact;
  className?: string;
};

/**
 * Badge for whether a contact is a linked platform user or a prospect.
 * "Platform user" reads as a positive/linked state (blue); "Prospect" is neutral (gray outline).
 */
export function ContactTypeBadge({ contact, className }: Props) {
  const { t } = useLingui();

  if (isPlatformUser(contact)) {
    return (
      <BadgeState
        state="platform-user"
        noColor
        icon={CircleUserRound}
        message={t`Platform user`}
        className={cn(
          'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
          className
        )}
      />
    );
  }

  return (
    <BadgeState
      state="prospect"
      noColor
      icon={UserPlus}
      message={t`Prospect`}
      className={className}
    />
  );
}
