import { getContactDetailMetadata, useContactDetailData } from '../shared';
import type { Route } from './+types/notes';
import AppActionBar from '@/components/app-actiobar';
import { DateTime } from '@/components/date';
import { DialogConfirm, DialogForm } from '@/components/dialog';
import { ListColumnHeader, ListTable } from '@/features/milo';
import {
  useCreateNoteMutation,
  useDeleteNoteMutation,
  useNoteCreatorNamesQuery,
  useNotesQuery,
  useUpdateNoteMutation,
  type NoteSubjectRef,
} from '@/resources/request/client';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@/utils/table';
import { Button } from '@datum-cloud/datum-ui/button';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import type { ComMiloapisNotesV1Alpha1Note } from '@openapi/notes.miloapis.com/v1alpha1';
import { useMemo, useState } from 'react';
import z from 'zod';

export const handle = { breadcrumb: () => <Trans>Notes</Trans> };

export const meta: Route.MetaFunction = ({ matches }) => {
  const { contactName } = getContactDetailMetadata(matches);
  return metaObject(`Notes - ${contactName}`);
};

/** Max note length, mirrored in the composer on the overview timeline. */
const NOTE_MAX_LENGTH = 1000;

const columnHelper = createColumnHelper<ComMiloapisNotesV1Alpha1Note>();

export default function Page() {
  const { t } = useLingui();
  const detail = useContactDetailData();
  const contactName = detail.contact?.metadata?.name ?? '';
  const namespace = detail.contact?.metadata?.namespace ?? 'default';

  const noteSubject: NoteSubjectRef = {
    apiGroup: 'notification.miloapis.com',
    kind: 'Contact',
    name: contactName,
    namespace,
  };

  const tableQuery = useNotesQuery(noteSubject);
  const items = useMemo(() => tableQuery.data?.items ?? [], [tableQuery.data?.items]);

  const creatorIds = useMemo(
    () => [
      ...new Set(items.map((n) => n.spec?.creatorRef?.name).filter((id): id is string => !!id)),
    ],
    [items]
  );
  const { data: creatorNames = {} } = useNoteCreatorNamesQuery(creatorIds);
  const creatorLabel = (note: ComMiloapisNotesV1Alpha1Note) => {
    const id = note.spec?.creatorRef?.name;
    return id ? (creatorNames[id] ?? id) : '—';
  };

  const [isAddNote, setIsAddNote] = useState(false);
  const [editNote, setEditNote] = useState<ComMiloapisNotesV1Alpha1Note | null>(null);
  const [deleteNote, setDeleteNote] = useState<ComMiloapisNotesV1Alpha1Note | null>(null);

  const createMutation = useCreateNoteMutation();
  const updateMutation = useUpdateNoteMutation();
  const deleteMutation = useDeleteNoteMutation();

  const actions: ActionItem<ComMiloapisNotesV1Alpha1Note>[] = [
    {
      label: t`Edit`,
      icon: <ACTION_ICONS.edit className="size-4" />,
      onClick: (row) => setEditNote(row),
    },
    {
      label: t`Delete`,
      icon: <ACTION_ICONS.delete className="size-4" />,
      variant: 'destructive' as const,
      onClick: (row) => setDeleteNote(row),
    },
  ];

  const columns = [
    columnHelper.accessor((row) => row.spec?.content ?? '', {
      id: 'content',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Note`} />,
      cell: ({ getValue }) => (
        <p className="line-clamp-2 max-w-xl whitespace-pre-wrap">{getValue()}</p>
      ),
    }),
    columnHelper.accessor((row) => creatorLabel(row), {
      id: 'author',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Added by`} />,
      cell: ({ getValue }) => <Text size="sm">{getValue()}</Text>,
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <div className="text-right" />,
      cell: ({ row }) => (
        <div className="flex w-full justify-end">
          <DataTable.RowActions row={row} actions={actions} />
        </div>
      ),
    }),
  ];

  const noteSchema = z.object({
    content: z
      .string()
      .trim()
      .nonempty(t`Note cannot be empty`)
      .max(NOTE_MAX_LENGTH),
  });

  const handleAddNote = async (formData: z.infer<typeof noteSchema>) => {
    await createMutation.mutateAsync({ subject: noteSubject, content: formData.content });
    toast.success(t`Note added successfully`);
  };

  const handleEditNote = async (formData: z.infer<typeof noteSchema>) => {
    await updateMutation.mutateAsync({
      namespace: editNote?.metadata?.namespace ?? namespace,
      noteName: editNote?.metadata?.name ?? '',
      content: formData.content,
    });
    setEditNote(null);
    toast.success(t`Note updated successfully`);
  };

  return (
    <>
      <AppActionBar>
        <Button
          type="primary"
          icon={<ACTION_ICONS.add size={16} />}
          onClick={() => setIsAddNote(true)}>
          <Trans>Add note</Trans>
        </Button>
      </AppActionBar>

      <DialogForm
        open={isAddNote}
        onOpenChange={() => setIsAddNote(false)}
        title={t`Add note`}
        submitText={t`Add`}
        cancelText={t`Cancel`}
        onSubmit={handleAddNote}
        schema={noteSchema}
        defaultValues={{ content: '' }}>
        <Form.Field name="content" label={t`Note`}>
          <Form.Textarea
            rows={4}
            placeholder={t`Add a note about this contact… (visible to staff only)`}
          />
        </Form.Field>
      </DialogForm>

      <DialogForm
        key={editNote?.metadata?.name}
        open={!!editNote}
        onOpenChange={() => setEditNote(null)}
        title={t`Edit note`}
        submitText={t`Save`}
        cancelText={t`Cancel`}
        onSubmit={handleEditNote}
        schema={noteSchema}
        defaultValues={{ content: editNote?.spec?.content ?? '' }}>
        <Form.Field name="content" label={t`Note`}>
          <Form.Textarea rows={4} />
        </Form.Field>
      </DialogForm>

      <DialogConfirm
        open={!!deleteNote}
        onOpenChange={() => setDeleteNote(null)}
        title={t`Delete note`}
        description={t`Are you sure you want to delete this note? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={async () => {
          await deleteMutation.mutateAsync({
            namespace: deleteNote?.metadata?.namespace ?? namespace,
            noteName: deleteNote?.metadata?.name ?? '',
          });
          setDeleteNote(null);
          toast.success(t`Note deleted successfully`);
        }}
      />

      <ListTable
        loading={tableQuery.isLoading}
        data={items}
        columns={columns}
        pageSize={50}
        getRowId={(row) => `${row.metadata?.namespace ?? ''}/${row.metadata?.name ?? ''}`}
        defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
        searchPlaceholder={t`Search notes...`}
        emptyMessage={t`No notes found.`}
        inset="tab"
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return [row.spec?.content, creatorLabel(row)]
            .map((s) => (s ?? '').toLowerCase())
            .some((s) => s.includes(q));
        }}
      />
    </>
  );
}
