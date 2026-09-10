import { usePasskeyRecovery } from '../hooks/usePasskeyRecovery';
import { DialogForm } from '@/components/dialog';
import { Alert, AlertDescription } from '@datum-cloud/datum-ui/alert';
import { Form } from '@datum-cloud/datum-ui/form';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { useMemo, useState } from 'react';
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
  const [error, setError] = useState<string | null>(null);

  // Built here rather than at module scope because the validation message is user-facing:
  // datum-ui's form renders it verbatim, so it has to come from `t` like every other
  // string. Same pattern as the contact-group form.
  const recoveryLinkSchema = useMemo(
    () =>
      z.object({
        reason: z
          .string()
          .min(REASON_MIN_LENGTH, t`Reason must be at least ${REASON_MIN_LENGTH} characters`),
      }),
    [t]
  );

  const name = `${user?.spec?.givenName ?? ''} ${user?.spec?.familyName ?? ''}`.trim();

  return (
    <DialogForm
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
      title={t`Send passkey recovery link`}
      description={t`This emails a one-time passkey setup link to the verified address on file for "${name}". It expires in about an hour and cannot be recalled.`}
      submitText={t`Send link`}
      cancelText={t`Cancel`}
      onSubmit={async (formData: z.infer<typeof recoveryLinkSchema>) => {
        setError(null);
        try {
          await sendRecoveryLink(user as ComMiloapisIamV1Alpha1User, formData.reason, onSuccess);
        } catch (err) {
          // Show what the server said and re-throw so DialogForm leaves the dialog open
          // with the typed reason intact.
          setError(err instanceof Error ? err.message : t`Sending the recovery link failed.`);
          throw err;
        }
      }}
      schema={recoveryLinkSchema}
      defaultValues={{ reason: '' }}>
      <>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Form.Field
          name="reason"
          label={t`Reason`}
          description={t`Recorded on the audit record alongside your name.`}
          required>
          <Form.Input placeholder={t`Ticket reference, or why the user needs this...`} />
        </Form.Field>
      </>
    </DialogForm>
  );
}
