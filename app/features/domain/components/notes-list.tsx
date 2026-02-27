import { NoteCard } from './note-card';
import { Text } from '@datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { ComMiloapisNotesV1Alpha1NoteList } from '@openapi/notes.miloapis.com/v1alpha1';

interface NotesListProps {
  notes: ComMiloapisNotesV1Alpha1NoteList | null | undefined;
  projectName: string;
  namespace: string;
  onNoteDeleted: () => void;
}

export function NotesList({ notes, projectName, namespace, onNoteDeleted }: NotesListProps) {
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
    <div className="flex flex-col gap-3">
      {sorted.map((note) => (
        <NoteCard
          key={note.metadata?.name}
          note={note}
          projectName={projectName}
          namespace={namespace}
          onDeleted={onNoteDeleted}
        />
      ))}
    </div>
  );
}
