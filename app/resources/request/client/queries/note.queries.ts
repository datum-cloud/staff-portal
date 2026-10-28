import {
  noteCreatorNamesQuery,
  noteListQuery,
  type NoteScope,
  type NoteSubjectRef,
} from '../apis/note.api';
import { useQuery } from '@tanstack/react-query';

const scopeKey = (scope: NoteScope) =>
  scope.kind === 'project' ? `project:${scope.projectName}` : 'core';

export const noteQueryKeys = {
  list: (subject: NoteSubjectRef, scope: NoteScope) =>
    ['notes', scopeKey(scope), subject.kind, subject.namespace, subject.name] as const,
  creators: (ids: string[]) => ['notes', 'creators', [...ids].sort()] as const,
};

/** Notes attached to a subject, in the given control-plane scope. */
export const useNotesQuery = (subject: NoteSubjectRef, scope: NoteScope = { kind: 'core' }) => {
  return useQuery({
    queryKey: noteQueryKeys.list(subject, scope),
    queryFn: () => noteListQuery(subject, scope),
    enabled: !!subject.name,
  });
};

/** Resolves note-creator ids to display names (full name › email › id). */
export const useNoteCreatorNamesQuery = (ids: string[]) => {
  return useQuery({
    queryKey: noteQueryKeys.creators(ids),
    queryFn: () => noteCreatorNamesQuery(ids),
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};
