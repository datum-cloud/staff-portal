import { useNoteCreate } from '../hooks/useNotes';
import { DialogForm } from '@/components/dialog';
import { NoteSubjectRef } from '@/resources/request/client/note.request';
import { Button } from '@datum-ui/button';
import { Form } from '@datum-ui/form';
import { toast } from '@datum-ui/toast';
import { Trans, useLingui } from '@lingui/react/macro';
import { Plus } from 'lucide-react';
import * as React from 'react';
import { useCallback, useState } from 'react';
import z from 'zod';

interface AddNoteDialogProps {
  subjectRef: NoteSubjectRef;
  onSuccess?: () => void;
}

export const AddNoteDialog: React.FC<AddNoteDialogProps> = ({ subjectRef, onSuccess }) => {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);

  // TanStack Query mutation
  const createMutation = useNoteCreate(subjectRef);

  const noteSchema = z.object({
    content: z
      .string()
      .nonempty(t`Note content is required`)
      .max(1000, t`Note content must be at most 1000 characters`),
    followUp: z.boolean().optional(),
    interactionTime: z.date().optional().nullable(),
    nextAction: z.string().optional(),
    nextActionTime: z.date().optional().nullable(),
  });

  const onSubmit = useCallback(
    async (value: z.infer<typeof noteSchema>) => {
      try {
        await createMutation.mutateAsync({
          content: value.content,
          ...(value.followUp !== undefined && { followUp: value.followUp }),
          ...(value.interactionTime && { interactionTime: value.interactionTime.toISOString() }),
          ...(value.nextAction && { nextAction: value.nextAction }),
          ...(value.nextActionTime && { nextActionTime: value.nextActionTime.toISOString() }),
        });

        toast.success(t`Note created successfully`);
        setOpen(false);
        onSuccess?.();
      } catch (error) {
        // Error is already handled by graphqlRequest (shows toast)
        console.error('Failed to create note:', error);
      }
    },
    [createMutation, t, onSuccess]
  );

  return (
    <>
      <Button theme="outline" size="small" icon={<Plus size={16} />} onClick={() => setOpen(true)}>
        <Trans>Add Note</Trans>
      </Button>

      <DialogForm
        open={open}
        onOpenChange={setOpen}
        title={t`Add Note`}
        submitText={createMutation.isPending ? t`Creating...` : t`Add Note`}
        cancelText={t`Cancel`}
        schema={noteSchema}
        defaultValues={{
          content: '',
          followUp: false,
          interactionTime: null,
          nextAction: '',
          nextActionTime: null,
        }}
        onSubmit={onSubmit}>
        {() => (
          <>
            <Form.Textarea
              field="content"
              label={t`Note`}
              placeholder={t`Enter your note here...`}
              required
              rows={4}
            />

            <Form.Checkbox field="followUp" label={t`Follow Up Required`} />

            <Form.DateTimePicker
              field="interactionTime"
              label={t`Interaction Time`}
              placeholder={t`Pick a date and time`}
              modal
            />

            <Form.Input
              field="nextAction"
              label={t`Next Action`}
              placeholder={t`What's the next follow-up action?`}
            />

            <Form.DateTimePicker
              field="nextActionTime"
              label={t`Next Action Time`}
              placeholder={t`Pick a date and time`}
              modal
            />
          </>
        )}
      </DialogForm>
    </>
  );
};
