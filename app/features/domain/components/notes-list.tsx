import { NoteCard } from './note-card';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { ComMiloapisNotesV1Alpha1NoteList } from '@openapi/notes.miloapis.com/v1alpha1';

interface NotesListProps {
  notes: ComMiloapisNotesV1Alpha1NoteList | null | undefined;
  projectName: string;
  namespace: string;
  userEmails?: Record<string, string>;
  onNoteDeleted: () => void;
}

export function NotesList({
  notes,
  projectName,
  namespace,
  userEmails,
  onNoteDeleted,
}: NotesListProps) {
  const sorted = [...(notes?.items ?? [])].sort(
    (a, b) =>
      new Date(b.metadata?.creationTimestamp ?? 0).getTime() -
      new Date(a.metadata?.creationTimestamp ?? 0).getTime()
  );

  if (sorted.length === 0) {
    return (
      <Text textColor="muted">
        <Trans>No notes yet. Add the first note below.</Trans>
      </Text>
    );
  }

  return (
    <div className="divide-y">
      {sorted.map((note) => (
        <div key={note.metadata?.name} className="py-2 first:pt-0 last:pb-0">
          <NoteCard
            note={note}
            projectName={projectName}
            namespace={namespace}
            creatorEmail={
              note.spec?.creatorRef?.name ? userEmails?.[note.spec.creatorRef.name] : undefined
            }
            onDeleted={onNoteDeleted}
          />
        </div>
      ))}
    </div>
  );
}
