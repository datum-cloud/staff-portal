import { PROXY_URL } from '@/modules/axios/axios.client';
import { createGqlClient } from '@/modules/graphql/client';
import { generateQueryOp } from '@/modules/graphql/generated';
import type { UserSummary } from '@/modules/graphql/generated/schema';
import {
  createNotesMiloapisComV1Alpha1NamespacedNote,
  deleteNotesMiloapisComV1Alpha1NamespacedNote,
  listNotesMiloapisComV1Alpha1NamespacedNote,
} from '@openapi/notes.miloapis.com/v1alpha1';

/**
 * Generic Notes client. Notes (`notes.miloapis.com`) attach to any resource via
 * `spec.subjectRef`, and the Note lives in one of two control planes. Callers pass
 * the subject they're annotating and the scope it lives in; this stays resource-
 * agnostic so domains, contacts, and future resources reuse it.
 */

/** The resource a note is attached to (written to `Note.spec.subjectRef`). */
export type NoteSubjectRef = {
  apiGroup: string;
  kind: string;
  name: string;
  namespace: string;
};

/**
 * Which control plane the Note resource lives in:
 * - `core`: the core control plane (contacts, users, and other core resources).
 * - `project`: a specific project's control plane (domains and other project-
 *   scoped resources), reached through the internal proxy.
 */
export type NoteScope = { kind: 'core' } | { kind: 'project'; projectName: string };

const scopeBaseURL = (scope: NoteScope): string | undefined =>
  scope.kind === 'project'
    ? `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${scope.projectName}/control-plane`
    : undefined;

export const noteListQuery = async (
  subject: NoteSubjectRef,
  scope: NoteScope = { kind: 'core' }
) => {
  const baseURL = scopeBaseURL(scope);
  const response = await listNotesMiloapisComV1Alpha1NamespacedNote({
    ...(baseURL && { baseURL }),
    path: { namespace: subject.namespace },
    query: {
      fieldSelector: `spec.subjectRef.name=${subject.name},spec.subjectRef.kind=${subject.kind}`,
    },
  });
  return response.data.data;
};

export const noteCreateMutation = async (
  subject: NoteSubjectRef,
  content: string,
  scope: NoteScope = { kind: 'core' }
) => {
  const baseURL = scopeBaseURL(scope);
  const response = await createNotesMiloapisComV1Alpha1NamespacedNote({
    ...(baseURL && { baseURL }),
    path: { namespace: subject.namespace },
    body: {
      apiVersion: 'notes.miloapis.com/v1alpha1',
      kind: 'Note',
      metadata: { generateName: 'note-', namespace: subject.namespace },
      spec: { subjectRef: subject, content },
    },
  });
  return response.data.data;
};

export const noteDeleteMutation = async (
  namespace: string,
  noteName: string,
  scope: NoteScope = { kind: 'core' }
) => {
  const baseURL = scopeBaseURL(scope);
  return deleteNotesMiloapisComV1Alpha1NamespacedNote({
    ...(baseURL && { baseURL }),
    path: { namespace, name: noteName },
  });
};

/**
 * Resolves note-creator user ids to a human-readable label (full name › email ›
 * the raw id as a fallback), via the `userSummaries` GraphQL query. Used to show
 * "Added by <name>" instead of an opaque user id.
 */
export const noteCreatorNamesQuery = async (ids: string[]): Promise<Record<string, string>> => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};

  const client = createGqlClient({ type: 'global' });
  const op = generateQueryOp({
    userSummaries: [
      { names: unique },
      { name: true, email: true, givenName: true, familyName: true },
    ],
  });
  const result = await client.query(op.query, op.variables).toPromise();
  const users: UserSummary[] = result.data?.userSummaries ?? [];

  const map: Record<string, string> = Object.fromEntries(
    users.map((u) => {
      const fullName = [u.givenName, u.familyName].filter(Boolean).join(' ');
      return [u.name, fullName || u.email || u.name];
    })
  );
  for (const id of unique) if (!map[id]) map[id] = id;
  return map;
};
