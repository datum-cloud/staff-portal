import {
  importAfterMocks,
  mockLogger,
  mockRequestClient,
} from '@/tests/setup/unit/request-client.mock';
import { describe, expect, test, vi, beforeEach } from 'vitest';

mockLogger();
const axiosMock = mockRequestClient();

describe('note.request', () => {
  let buildNoteFieldSelector: typeof import('./note.request').buildNoteFieldSelector;
  let noteListQuery: typeof import('./note.request').noteListQuery;
  let followUpNotesListQuery: typeof import('./note.request').followUpNotesListQuery;
  let noteCreateMutation: typeof import('./note.request').noteCreateMutation;
  let noteUpdateMutation: typeof import('./note.request').noteUpdateMutation;
  let noteDeleteMutation: typeof import('./note.request').noteDeleteMutation;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await importAfterMocks<typeof import('@/resources/request/client/note.request')>(
      '@/resources/request/client/note.request'
    );
    buildNoteFieldSelector = mod.buildNoteFieldSelector;
    noteListQuery = mod.noteListQuery;
    followUpNotesListQuery = mod.followUpNotesListQuery;
    noteCreateMutation = mod.noteCreateMutation;
    noteUpdateMutation = mod.noteUpdateMutation;
    noteDeleteMutation = mod.noteDeleteMutation;
  });

  describe('buildNoteFieldSelector', () => {
    test('builds selector for User without namespace', () => {
      const selector = buildNoteFieldSelector({
        kind: 'User',
        name: 'user-123',
        apiGroup: 'iam_miloapis_com',
      });

      expect(selector).toBe('spec.subjectRef.kind=User,spec.subjectRef.name=user-123');
    });

    test('builds selector for Contact with namespace', () => {
      const selector = buildNoteFieldSelector({
        kind: 'Contact',
        name: 'contact-456',
        namespace: 'org-ns',
        apiGroup: 'notification_miloapis_com',
      });

      expect(selector).toBe(
        'spec.subjectRef.kind=Contact,spec.subjectRef.name=contact-456,spec.subjectRef.namespace=org-ns'
      );
    });
  });

  describe('noteListQuery', () => {
    test('fetches notes with fieldSelector for User', async () => {
      await noteListQuery({
        kind: 'User',
        name: 'user-123',
        apiGroup: 'iam_miloapis_com',
      });

      expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/graphql',
        baseURL: '',
        data: {
          query: expect.any(String),
          variables: {
            fieldSelector: 'spec.subjectRef.kind=User,spec.subjectRef.name=user-123',
          },
        },
      });
    });

    test('fetches notes with fieldSelector for Contact with namespace', async () => {
      await noteListQuery({
        kind: 'Contact',
        name: 'contact-456',
        namespace: 'org-ns',
        apiGroup: 'notification_miloapis_com',
      });

      expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/graphql',
        baseURL: '',
        data: {
          query: expect.any(String),
          variables: {
            fieldSelector:
              'spec.subjectRef.kind=Contact,spec.subjectRef.name=contact-456,spec.subjectRef.namespace=org-ns',
          },
        },
      });
    });
  });

  describe('followUpNotesListQuery', () => {
    test('fetches all follow-up notes when no createdBy filter', async () => {
      await followUpNotesListQuery();

      expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/graphql',
        baseURL: '',
        data: {
          query: expect.any(String),
          variables: {
            fieldSelector: 'spec.followUp=true',
          },
        },
      });
    });

    test('fetches follow-up notes filtered by createdBy', async () => {
      await followUpNotesListQuery({ createdBy: 'user@example.com' });

      expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/graphql',
        baseURL: '',
        data: {
          query: expect.any(String),
          variables: {
            fieldSelector: 'spec.followUp=true,status.createdBy=user@example.com',
          },
        },
      });
    });
  });

  describe('noteCreateMutation', () => {
    test('creates note for User with all fields', async () => {
      await noteCreateMutation({
        content: 'Test note content',
        followUp: true,
        nextAction: 'Call back',
        nextActionTime: '2025-01-15T10:00:00Z',
        interactionTime: '2025-01-10T09:00:00Z',
        subjectRef: {
          kind: 'User',
          name: 'user-123',
          apiGroup: 'iam_miloapis_com',
        },
      });

      expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/graphql',
        baseURL: '',
        data: {
          query: expect.any(String),
          variables: {
            input: {
              apiVersion: 'crm.miloapis.com/v1alpha1',
              kind: 'Note',
              metadata: {
                generateName: 'note-',
              },
              spec: {
                content: 'Test note content',
                followUp: true,
                nextAction: 'Call back',
                nextActionTime: '2025-01-15T10:00:00Z',
                interactionTime: '2025-01-10T09:00:00Z',
                subjectRef: {
                  kind: 'User',
                  name: 'user-123',
                  apiGroup: 'iam_miloapis_com',
                },
              },
            },
          },
        },
      });
    });

    test('creates note with derived apiGroup for User', async () => {
      await noteCreateMutation({
        content: 'Simple note',
        subjectRef: {
          kind: 'User',
          name: 'user-456',
          apiGroup: 'iam_miloapis_com',
        },
      });

      const callArgs = axiosMock.apiRequestClient.mock.calls[0][0];
      expect(callArgs.data.variables.input.spec.subjectRef.apiGroup).toBe('iam_miloapis_com');
    });

    test('creates note with derived apiGroup for Contact', async () => {
      await noteCreateMutation({
        content: 'Contact note',
        subjectRef: {
          kind: 'Contact',
          name: 'contact-789',
          namespace: 'org-ns',
          apiGroup: 'notification_miloapis_com',
        },
      });

      const callArgs = axiosMock.apiRequestClient.mock.calls[0][0];
      expect(callArgs.data.variables.input.spec.subjectRef.apiGroup).toBe(
        'notification_miloapis_com'
      );
      expect(callArgs.data.variables.input.spec.subjectRef.namespace).toBe('org-ns');
    });

    test('creates note with only required fields', async () => {
      await noteCreateMutation({
        content: 'Minimal note',
        subjectRef: {
          kind: 'User',
          name: 'user-minimal',
          apiGroup: 'iam_miloapis_com',
        },
      });

      const callArgs = axiosMock.apiRequestClient.mock.calls[0][0];
      const spec = callArgs.data.variables.input.spec;

      expect(spec.content).toBe('Minimal note');
      expect(spec.subjectRef.kind).toBe('User');
      expect(spec.subjectRef.name).toBe('user-minimal');
      // Optional fields should not be present or be undefined
      expect(spec.followUp).toBeUndefined();
      expect(spec.nextAction).toBeUndefined();
    });
  });

  describe('noteUpdateMutation', () => {
    test('updates single field', async () => {
      await noteUpdateMutation('note-123', {
        followUp: true,
      });

      expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/graphql',
        baseURL: '',
        data: {
          query: expect.any(String),
          variables: {
            name: 'note-123',
            input: [{ op: 'replace', path: '/spec/followUp', value: true }],
          },
        },
      });
    });

    test('updates multiple fields', async () => {
      await noteUpdateMutation('note-456', {
        content: 'Updated content',
        followUp: false,
        nextAction: 'Schedule meeting',
      });

      const callArgs = axiosMock.apiRequestClient.mock.calls[0][0];
      const operations = callArgs.data.variables.input;

      expect(operations).toHaveLength(3);
      expect(operations).toContainEqual({
        op: 'replace',
        path: '/spec/content',
        value: 'Updated content',
      });
      expect(operations).toContainEqual({
        op: 'replace',
        path: '/spec/followUp',
        value: false,
      });
      expect(operations).toContainEqual({
        op: 'replace',
        path: '/spec/nextAction',
        value: 'Schedule meeting',
      });
    });

    test('skips undefined fields', async () => {
      await noteUpdateMutation('note-789', {
        content: 'Only content updated',
        followUp: undefined,
      });

      const callArgs = axiosMock.apiRequestClient.mock.calls[0][0];
      const operations = callArgs.data.variables.input;

      expect(operations).toHaveLength(1);
      expect(operations[0]).toEqual({
        op: 'replace',
        path: '/spec/content',
        value: 'Only content updated',
      });
    });

    test('handles empty update (no operations)', async () => {
      await noteUpdateMutation('note-empty', {});

      const callArgs = axiosMock.apiRequestClient.mock.calls[0][0];
      const operations = callArgs.data.variables.input;

      expect(operations).toHaveLength(0);
    });
  });

  describe('noteDeleteMutation', () => {
    test('deletes note by name', async () => {
      await noteDeleteMutation('note-to-delete');

      expect(axiosMock.apiRequestClient).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/apis/crm.miloapis.com/v1alpha1/notes/note-to-delete',
      });
      expect(axiosMock.__builder.execute).toHaveBeenCalledTimes(1);
    });
  });
});
