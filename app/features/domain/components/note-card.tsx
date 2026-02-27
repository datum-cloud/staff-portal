import ButtonDeleteAction from '@/components/button/button-delete-action';
import { DateTime } from '@/components/date';
import { Card, CardContent } from '@/modules/shadcn/ui/card';
import { noteDeleteMutation } from '@/resources/request/client';
import { toast } from '@datum-ui/toast';
import { Text } from '@datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { ComMiloapisNotesV1Alpha1Note } from '@openapi/notes.miloapis.com/v1alpha1';

interface NoteCardProps {
  note: ComMiloapisNotesV1Alpha1Note;
  projectName: string;
  namespace: string;
  onDeleted: () => void;
}

export function NoteCard({ note, projectName, namespace, onDeleted }: NoteCardProps) {
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
    <Card className="shadow-none">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Text className="break-words whitespace-pre-wrap">{note.spec?.content}</Text>
            <div className="mt-1 flex items-center gap-2">
              <Text size="xs" textColor="muted">
                <Trans>Added by</Trans> {note.spec?.creatorRef?.name ?? t`Unknown`}
              </Text>
              <Text size="xs" textColor="muted">
                &middot;
              </Text>
              <Text size="xs" textColor="muted">
                <DateTime date={note.metadata?.creationTimestamp} variant="both" />
              </Text>
            </div>
          </div>
          <ButtonDeleteAction
            itemType={t`Note`}
            description={t`This note will be permanently deleted and cannot be recovered.`}
            onConfirm={handleDelete}
            disabled={!noteName}
          />
        </div>
      </CardContent>
    </Card>
  );
}
