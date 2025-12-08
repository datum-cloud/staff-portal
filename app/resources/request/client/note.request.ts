import { apiRequestClient } from '@/modules/axios/axios.client';
import { graphqlRequest } from '@/modules/graphql/graphql.client';
import {
  CreateNoteDocument,
  CreateNoteMutation,
  CreateNoteMutationVariables,
  ListFollowUpNotesDocument,
  ListFollowUpNotesQuery,
  ListNotesDocument,
  ListNotesQuery,
  PatchNoteDocument,
  PatchNoteMutation,
} from '@/resources/graphql/gen/graphql';

// Derive types from auto-generated operation types
type GqlNoteSpec = NonNullable<CreateNoteMutationVariables['input']['spec']>;

export type NoteSubjectRef = GqlNoteSpec['subjectRef'];

export type CreateNoteInput = Omit<GqlNoteSpec, 'creatorRef'>;

/**
 * Input type for updating notes (partial).
 * All fields are optional since we use JSON Patch for partial updates.
 */
export type UpdateNoteInput = Partial<Omit<GqlNoteSpec, 'subjectRef' | 'creatorRef'>>;

/**
 * Build field selector string for filtering notes
 */
export function buildNoteFieldSelector(subjectRef: NoteSubjectRef): string {
  const selectors = [
    `spec.subjectRef.kind=${subjectRef.kind}`,
    `spec.subjectRef.name=${subjectRef.name}`,
  ];

  if (subjectRef.namespace) {
    selectors.push(`spec.subjectRef.namespace=${subjectRef.namespace}`);
  }

  return selectors.join(',');
}

/**
 * Get the API group for a subject kind.
 * Maps kind strings to the GraphQL schema string literal values.
 */
function getApiGroup(kind: NoteSubjectRef['kind']): NoteSubjectRef['apiGroup'] {
  return kind === 'User' ? 'iam_miloapis_com' : 'notification_miloapis_com';
}

/**
 * Fetch notes for a specific subject (User or Contact)
 */
export async function noteListQuery(subjectRef: NoteSubjectRef): Promise<ListNotesQuery> {
  const fieldSelector = buildNoteFieldSelector(subjectRef);

  return graphqlRequest(ListNotesDocument, { fieldSelector });
}

export interface FollowUpNotesQueryOptions {
  /** Filter by creator email. If undefined, returns all follow-up notes */
  createdBy?: string;
}

/**
 * Fetch notes with followUp=true, optionally filtered by creator
 */
export async function followUpNotesListQuery(
  options?: FollowUpNotesQueryOptions
): Promise<ListFollowUpNotesQuery> {
  // Build field selector: always include followUp=true
  const selectors = ['spec.followUp=true'];

  // Add createdBy filter if provided
  if (options?.createdBy) {
    selectors.push(`status.createdBy=${options.createdBy}`);
  }

  const fieldSelector = selectors.join(',');

  return graphqlRequest(ListFollowUpNotesDocument, { fieldSelector });
}

/**
 * Create a new note for a User or Contact.
 * Spreads all input fields directly - the type system ensures required fields are present.
 * New schema fields in CreateNoteInput will automatically be included.
 */
export async function noteCreateMutation(input: CreateNoteInput): Promise<CreateNoteMutation> {
  // Separate subjectRef (needs special handling) from other spec fields
  const { subjectRef, ...specFields } = input;

  return graphqlRequest(CreateNoteDocument, {
    input: {
      apiVersion: 'crm.miloapis.com/v1alpha1',
      kind: 'Note',
      metadata: {
        generateName: 'note-',
      },
      spec: {
        ...specFields,
        // Handle subjectRef specially (derive apiGroup from kind)
        subjectRef: {
          kind: subjectRef.kind,
          name: subjectRef.name,
          apiGroup: subjectRef.apiGroup ?? getApiGroup(subjectRef.kind),
          ...(subjectRef.namespace && { namespace: subjectRef.namespace }),
        },
      },
    },
  });
}

/**
 * JSON Patch operation (RFC 6902)
 */
interface JsonPatchOp {
  op: 'replace';
  path: string;
  value?: unknown;
}

/**
 * Update an existing note (patch) using GraphQL with JSON Patch format.
 * Dynamically builds patch operations from input keys, so new schema fields
 * are automatically supported.
 */
export async function noteUpdateMutation(
  noteName: string,
  input: UpdateNoteInput
): Promise<PatchNoteMutation> {
  // Build JSON Patch operations array (RFC 6902)
  // Dynamically iterate over input keys so new fields are automatically included
  const operations: JsonPatchOp[] = Object.entries(input)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({
      op: 'replace' as const,
      path: `/spec/${key}`,
      value,
    }));

  return graphqlRequest(PatchNoteDocument, {
    name: noteName,
    input: operations,
  });
}

/**
 * Delete a note by name
 */
export async function noteDeleteMutation(noteName: string): Promise<void> {
  await apiRequestClient({
    method: 'DELETE',
    url: `/apis/crm.miloapis.com/v1alpha1/notes/${noteName}`,
  }).execute();
}
