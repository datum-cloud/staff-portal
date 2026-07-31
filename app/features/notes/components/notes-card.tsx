import ButtonDeleteAction from '@/components/button/button-delete-action';
import { DateTime } from '@/components/date';
import { SectionCard } from '@/features/milo';
import {
  noteCreateMutation,
  noteDeleteMutation,
  noteQueryKeys,
  useNoteCreatorNamesQuery,
  useNotesQuery,
  type NoteScope,
  type NoteSubjectRef,
} from '@/resources/request/client';
import { Button } from '@datum-cloud/datum-ui/button';
import { Textarea } from '@datum-cloud/datum-ui/textarea';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import type { ComMiloapisNotesV1Alpha1Note } from '@openapi/notes.miloapis.com/v1alpha1';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

const MAX_LENGTH = 1000;

type Props = {
  /** The resource the notes are attached to (written to `spec.subjectRef`). */
  subject: NoteSubjectRef;
  /** Which control plane the notes live in. Defaults to the core control plane. */
  scope?: NoteScope;
  className?: string;
};

/**
 * Reusable Notes section — list, add, and delete notes for any resource. Pass the
 * subject (what the notes attach to) and the scope (core vs a project control
 * plane); the component owns fetching, creator-name resolution, and refetching.
 */
export function NotesCard({ subject, scope = { kind: 'core' }, className }: Props) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const { data, isLoading } = useNotesQuery(subject, scope);

  const notes = useMemo(
    () =>
      [...(data?.items ?? [])].sort(
        (a, b) =>
          new Date(b.metadata?.creationTimestamp ?? 0).getTime() -
          new Date(a.metadata?.creationTimestamp ?? 0).getTime()
      ),
    [data]
  );

  const creatorIds = useMemo(
    () => [
      ...new Set(notes.map((n) => n.spec?.creatorRef?.name).filter((id): id is string => !!id)),
    ],
    [notes]
  );
  const { data: creatorNames = {} } = useNoteCreatorNamesQuery(creatorIds);

  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: noteQueryKeys.list(subject, scope) });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await noteCreateMutation(subject, content.trim(), scope);
      setContent('');
      await refetch();
      toast.success(t`Note added`);
    } catch {
      // Error toast is handled by the axios interceptor
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (note: ComMiloapisNotesV1Alpha1Note) => {
    const noteName = note.metadata?.name;
    if (!noteName) return;
    try {
      await noteDeleteMutation(subject.namespace, noteName, scope);
      toast.success(t`Note deleted`);
      await refetch();
    } catch {
      // Error toast is handled by the axios interceptor
    }
  };

  return (
    <SectionCard className={className} title={<Trans>Notes</Trans>}>
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <Text textColor="muted">
            <Trans>Loading…</Trans>
          </Text>
        ) : notes.length === 0 ? (
          <Text textColor="muted">
            <Trans>No notes yet. Add the first note below.</Trans>
          </Text>
        ) : (
          <div className="divide-y">
            {notes.map((note) => {
              const creatorId = note.spec?.creatorRef?.name;
              const creator = (creatorId && creatorNames[creatorId]) || creatorId || t`Unknown`;
              return (
                <div
                  key={note.metadata?.name}
                  className="flex items-start justify-between gap-4 py-2 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Text className="break-words whitespace-pre-wrap">{note.spec?.content}</Text>
                    <Text size="xs" textColor="muted">
                      <Trans>Added by</Trans> {creator}
                      {' · '}
                      <DateTime date={note.metadata?.creationTimestamp} variant="both" />
                    </Text>
                  </div>
                  <ButtonDeleteAction
                    itemType={t`Note`}
                    description={t`This note will be permanently deleted and cannot be recovered.`}
                    onConfirm={() => handleDelete(note)}
                    buttonProps={{ disabled: !note.metadata?.name }}
                  />
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handleAdd} className="flex flex-col gap-2 border-t pt-4">
          <label htmlFor="note-content">
            <Text>
              <Trans>Add a note</Trans>
            </Text>
          </label>
          <Textarea
            id="note-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t`Enter note content...`}
            rows={4}
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between">
            <Text size="xs" textColor={content.length > MAX_LENGTH ? 'destructive' : 'muted'}>
              {content.length}/{MAX_LENGTH}
            </Text>
            <Button
              htmlType="submit"
              disabled={content.trim().length === 0 || content.length > MAX_LENGTH || isSubmitting}
              loading={isSubmitting}>
              <Trans>Add Note</Trans>
            </Button>
          </div>
        </form>
      </div>
    </SectionCard>
  );
}
