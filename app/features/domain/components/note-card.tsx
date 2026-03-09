import ButtonDeleteAction from '@/components/button/button-delete-action';
import { DateTime } from '@/components/date';
import { noteDeleteMutation } from '@/resources/request/client';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { ComMiloapisNotesV1Alpha1Note } from '@openapi/notes.miloapis.com/v1alpha1';

interface NoteCardProps {
  note: ComMiloapisNotesV1Alpha1Note;
  projectName: string;
  namespace: string;
  creatorEmail?: string;
  onDeleted: () => void;
}

export function NoteCard({ note, projectName, namespace, creatorEmail, onDeleted }: NoteCardProps) {
  const { t } = useLingui();

  const noteName = note.metadata?.name;

  const handleDelete = async () => {
    if (!noteName) return;
    try {
      await noteDeleteMutation(projectName, namespace, noteName);
      toast.success(t`Note deleted`);
      onDeleted();
    } catch {
      // Error toast is handled by the axios interceptor
    }
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Text className="break-words whitespace-pre-wrap">{note.spec?.content}</Text>
        <Text size="xs" textColor="muted">
          <Trans>Added by</Trans> {creatorEmail ?? note.spec?.creatorRef?.name ?? t`Unknown`}
          {' · '}
          <DateTime date={note.metadata?.creationTimestamp} variant="both" />
        </Text>
      </div>
      <ButtonDeleteAction
        itemType={t`Note`}
        description={t`This note will be permanently deleted and cannot be recovered.`}
        onConfirm={handleDelete}
        buttonProps={{ disabled: !noteName }}
      />
    </div>
  );
}
