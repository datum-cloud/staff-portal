import { ListNotesQuery } from '@/resources/graphql/gen/graphql';
import {
  CreateNoteInput,
  noteCreateMutation,
  noteDeleteMutation,
  noteListQuery,
  noteUpdateMutation,
  NoteSubjectRef,
  UpdateNoteInput,
} from '@/resources/request/client/note.request';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Extract the note item type from the GraphQL response
export type NoteItem = NonNullable<
  NonNullable<ListNotesQuery['listCrmMiloapisComV1alpha1Note']>['items'][number]
>;

// Query keys factory for notes
export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (subjectRef: NoteSubjectRef) =>
    [...noteKeys.lists(), subjectRef.kind, subjectRef.name, subjectRef.namespace] as const,
};

interface UseNotesOptions {
  subjectRef: NoteSubjectRef;
  enabled?: boolean;
}

/**
 * Hook for fetching notes with TanStack Query
 */
export function useNotes({ subjectRef, enabled = true }: UseNotesOptions) {
  return useQuery({
    queryKey: noteKeys.list(subjectRef),
    queryFn: async () => {
      const response = await noteListQuery(subjectRef);
      const items = response.listCrmMiloapisComV1alpha1Note?.items || [];
      return items.filter((item): item is NoteItem => item != null);
    },
    enabled,
  });
}

/**
 * Hook for creating a note
 */
export function useNoteCreate(subjectRef: NoteSubjectRef) {
  const queryClient = useQueryClient();
  const queryKey = noteKeys.list(subjectRef);

  return useMutation({
    mutationFn: (input: Omit<CreateNoteInput, 'subjectRef'>) =>
      noteCreateMutation({
        ...input,
        subjectRef,
      }),
    onSuccess: () => {
      // Invalidate and refetch the notes list
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/**
 * Hook for deleting a note with optimistic updates
 */
export function useNoteDelete(subjectRef: NoteSubjectRef) {
  const queryClient = useQueryClient();
  const queryKey = noteKeys.list(subjectRef);

  return useMutation({
    mutationFn: (noteName: string) => noteDeleteMutation(noteName),
    onMutate: async (noteName) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousNotes = queryClient.getQueryData<NoteItem[]>(queryKey);

      // Optimistically remove the note
      queryClient.setQueryData<NoteItem[]>(queryKey, (old) =>
        old?.filter((note) => note.metadata?.name !== noteName)
      );

      return { previousNotes };
    },
    onError: (_err, _noteName, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(queryKey, context.previousNotes);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

interface NoteUpdateVariables {
  noteName: string;
  input: UpdateNoteInput;
}

/**
 * Hook for updating a note with optimistic updates
 */
export function useNoteUpdate(subjectRef: NoteSubjectRef) {
  const queryClient = useQueryClient();
  const queryKey = noteKeys.list(subjectRef);

  return useMutation({
    mutationFn: ({ noteName, input }: NoteUpdateVariables) => noteUpdateMutation(noteName, input),
    onMutate: async ({ noteName, input }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousNotes = queryClient.getQueryData<NoteItem[]>(queryKey);

      // Filter out undefined values (only update provided fields)
      const definedFields = Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== undefined)
      );

      // Optimistically update the note
      queryClient.setQueryData<NoteItem[]>(queryKey, (old) =>
        old?.map((note) => {
          if (note.metadata?.name === noteName && note.spec) {
            return {
              ...note,
              spec: {
                ...note.spec,
                ...definedFields,
              },
            } as NoteItem;
          }
          return note;
        })
      );

      return { previousNotes };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(queryKey, context.previousNotes);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/**
 * Hook for toggling follow-up status (convenience wrapper)
 */
export function useNoteFollowUpToggle(subjectRef: NoteSubjectRef) {
  const mutation = useNoteUpdate(subjectRef);

  const toggle = (noteName: string, followUp: boolean) => {
    return mutation.mutateAsync({
      noteName,
      input: { followUp },
    });
  };

  return {
    toggle,
    isPending: mutation.isPending,
  };
}
