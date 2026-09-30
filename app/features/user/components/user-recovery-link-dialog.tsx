import { usePasskeyRecovery } from '../hooks/usePasskeyRecovery';
import { DialogForm } from '@/components/dialog';
import { Form } from '@datum-cloud/datum-ui/form';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { useMemo } from 'react';
import z from 'zod';

interface UserRecoveryLinkDialogProps {
  open: boolean;
  user: ComMiloapisIamV1Alpha1User | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void>;
}

// Matches the reason floor the platform-access actions use; the reason is the audit record.
const REASON_MIN_LENGTH = 5;

/**
 * The support-side half of Phase C account recovery: mails a one-time passkey setup link
 * to the address on file. There is nothing to show afterwards — the API never returns the
 * code — so the dialog's job is to take a reason and to be honest about what pressing the
 * button does.
 */
export function UserRecoveryLinkDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserRecoveryLinkDialogProps) {
  const { t } = useLingui();
  const { sendRecoveryLink } = usePasskeyRecovery();

  // Built here rather than at module scope because the validation message is user-facing:
  // datum-ui's form renders it verbatim, so it has to come from `t` like every other
  // string. Same pattern as the contact-group form.
  const recoveryLinkSchema = useMemo(
    () =>
      z.object({
        // Trim first: the server rejects a whitespace-only reason (it TrimSpaces before the
        // required check), so accepting one here would only move the refusal later.
        reason: z
          .string()
          .trim()
          .min(REASON_MIN_LENGTH, t`Reason must be at least ${REASON_MIN_LENGTH} characters`),
      }),
    [t]
  );

  const name = `${user?.spec?.givenName ?? ''} ${user?.spec?.familyName ?? ''}`.trim();

  return (
    <DialogForm
      open={open}
      onOpenChange={onOpenChange}
      title={t`Send passkey recovery link`}
      description={t`This emails a one-time passkey setup link to the verified address on file for "${name}". It expires in about an hour and cannot be recalled.`}
      submitText={t`Send link`}
      cancelText={t`Cancel`}
      onSubmit={async (formData: z.infer<typeof recoveryLinkSchema>) => {
        // A rejection keeps DialogForm open with the typed reason; the axios client toasts the error.
        await sendRecoveryLink(user as ComMiloapisIamV1Alpha1User, formData.reason, onSuccess);
      }}
      schema={recoveryLinkSchema}
      defaultValues={{ reason: '' }}>
      <Form.Field
        name="reason"
        label={t`Reason`}
        description={t`Recorded on the audit record alongside your name.`}
        required>
        <Form.Input placeholder={t`Ticket reference, or why the user needs this...`} />
      </Form.Field>
    </DialogForm>
  );
}
