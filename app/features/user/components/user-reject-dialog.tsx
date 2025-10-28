import { DialogForm } from '@/components/dialog';
import { useUserApproval } from '@/features/user';
import { User } from '@/resources/schemas';
import { Form } from '@datum-ui/form';
import { useLingui } from '@lingui/react/macro';
import z from 'zod';

interface UserRejectDialogProps {
  open: boolean;
  user: User | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void>;
}

const rejectSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});

export function UserRejectDialog({ open, onOpenChange, user, onSuccess }: UserRejectDialogProps) {
  const { t } = useLingui();
  const { rejectUser } = useUserApproval();

  return (
    <DialogForm
      open={open}
      onOpenChange={onOpenChange}
      title={t`Reject User`}
      description={t`Please provide a reason for rejecting "${user?.spec.givenName ?? ''} ${user?.spec.familyName ?? ''}".`}
      submitText={t`Reject`}
      cancelText={t`Cancel`}
      onSubmit={async (formData: z.infer<typeof rejectSchema>) => {
        try {
          await rejectUser(user as User, formData.reason, onSuccess);
        } catch (error) {
          throw error; // Re-throw to keep dialog open
        }
      }}
      schema={rejectSchema}
      defaultValues={{ reason: '' }}>
      <Form.Input
        field="reason"
        label={t`Reason for rejection`}
        placeholder={t`Enter reason for rejection...`}
        required
      />
    </DialogForm>
  );
}
