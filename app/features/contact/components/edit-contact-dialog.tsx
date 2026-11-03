import { ContactForm } from './contact-form';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Trans, useLingui } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { ComMiloapisNotificationV1Alpha1Contact } from '@openapi/notification.miloapis.com/v1alpha1';
import * as React from 'react';
import { useRevalidator } from 'react-router';

type Props = {
  contact?: ComMiloapisNotificationV1Alpha1Contact;
  user?: ComMiloapisIamV1Alpha1User;
  /** Trigger styling: a bordered action in the page header, or a borderless one in a card header. */
  variant?: 'header' | 'card';
};

/**
 * Edit a contact (#760) from a dialog that hosts the existing {@link ContactForm}
 * in edit mode — including its duplicate-email check. On save the dialog closes
 * and revalidates the route loader, so the header and About card (both read that
 * loader) refresh in place with no reload.
 */
export function EditContactDialog({ contact, user, variant = 'card' }: Props) {
  const { t } = useLingui();
  const { revalidate } = useRevalidator();
  const [open, setOpen] = React.useState(false);
  const EditIcon = ACTION_ICONS.edit;

  return (
    <>
      <Button
        type={variant === 'header' ? 'secondary' : 'tertiary'}
        theme={variant === 'header' ? 'outline' : 'borderless'}
        size="xs"
        icon={<EditIcon size={14} />}
        onClick={() => setOpen(true)}>
        <Trans>Edit</Trans>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <Dialog.Content className="sm:max-w-md">
          <Dialog.Header title={t`Edit contact`} />
          <Dialog.Body className="px-5 pb-5">
            <ContactForm
              contact={contact}
              user={user}
              onCancel={() => setOpen(false)}
              onSuccess={async () => {
                await revalidate();
                setOpen(false);
              }}
            />
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    </>
  );
}
