import { DialogForm } from '@/components/dialog';
import { useDecideServiceConsumerMutation } from '@/resources/request/client';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { t } from '@lingui/core/macro';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';

export type Decision = 'Approved' | 'Denied';

const schema = z.object({
  message: z.string().optional(),
});

export function useApprovalDialog(producerProject: string) {
  const decideMutation = useDecideServiceConsumerMutation(producerProject);
  const [pending, setPending] = useState<{ consumerName: string; decision: Decision } | null>(null);

  // Takes the consumer's name (metadata.name) so callers can drive the dialog
  // from either the raw k8s shape or the gateway-enriched flat shape.
  const openDialog = (consumerName: string, decision: Decision) =>
    setPending({ consumerName, decision });

  const isApproving = pending?.decision === 'Approved';

  const dialog: ReactNode = (
    <DialogForm
      open={!!pending}
      onOpenChange={(open) => {
        if (!open) setPending(null);
      }}
      title={isApproving ? t`Approve Request` : t`Deny Request`}
      description={
        isApproving
          ? t`Approve this consumer's access request. Optionally add a note.`
          : t`Deny this consumer's access request. Optionally add a note.`
      }
      submitText={isApproving ? t`Approve` : t`Deny`}
      cancelText={t`Cancel`}
      schema={schema}
      defaultValues={{ message: '' }}
      requireDirty={false}
      onSubmit={async (formData) => {
        if (!pending) return;
        await decideMutation.mutateAsync({
          consumerName: pending.consumerName,
          decision: pending.decision,
          message: formData.message || undefined,
        });
        toast.success(pending.decision === 'Approved' ? t`Request approved` : t`Request denied`);
        setPending(null);
      }}>
      <Form.Field name="message" label={t`Note`}>
        <Form.Textarea placeholder={t`Optional reviewer note...`} rows={3} />
      </Form.Field>
    </DialogForm>
  );

  return { openDialog, dialog, isPending: decideMutation.isPending };
}
