import { noteCreateMutation, noteQueryKeys, type NoteSubjectRef } from '@/resources/request/client';
import { Button } from '@datum-cloud/datum-ui/button';
import { Textarea } from '@datum-cloud/datum-ui/textarea';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

/** Max note length, enforced in the counter + submit guard. */
export const NOTE_MAX_LENGTH = 1000;

/** Note composer — the only write surface on the timeline (#759). */
export function NoteComposer({ subject }: { subject: NoteSubjectRef }) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [content, setContent] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const trimmed = content.trim();
  const canSubmit = !!subject.name && trimmed.length > 0 && trimmed.length <= NOTE_MAX_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await noteCreateMutation(subject, trimmed);
      setContent('');
      await queryClient.invalidateQueries({
        queryKey: noteQueryKeys.list(subject, { kind: 'core' }),
      });
      toast.success(t`Note added`);
    } catch {
      // Error toast is handled by the axios interceptor.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card flex flex-col gap-3 rounded-xl border p-4">
      <Textarea
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t`Add a note about this contact… (visible to staff only)`}
        aria-label={t`Add a note`}
        disabled={isSubmitting}
      />
      <div className="flex items-center justify-between">
        <Text size="xs" textColor={content.length > NOTE_MAX_LENGTH ? 'destructive' : 'muted'}>
          {content.length} / {NOTE_MAX_LENGTH}
        </Text>
        <Button htmlType="submit" disabled={!canSubmit || isSubmitting} loading={isSubmitting}>
          <Trans>Add note</Trans>
        </Button>
      </div>
    </form>
  );
}
