import {
  NoteItem,
  useNoteDelete,
  useNoteFollowUpToggle,
  useNotes,
  useNoteUpdate,
} from '../hooks/useNotes';
import { ButtonCopy } from '@/components/button';
import { DateFormatter, DateRangePicker } from '@/components/date';
import { DialogConfirm, DialogForm } from '@/components/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shadcn/ui/card';
import { Checkbox } from '@/modules/shadcn/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/modules/shadcn/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/shadcn/ui/table';
import { NoteSubjectRef } from '@/resources/request/client/note.request';
import { Button } from '@datum-ui/button';
import { Form } from '@datum-ui/form';
import { toast } from '@datum-ui/toast';
import { Tooltip } from '@datum-ui/tooltip';
import { Text } from '@datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { ArrowDown, ArrowUp, ArrowUpDown, Info, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
import z from 'zod';

type SortField = 'created' | 'interactionTime' | 'nextActionTime';
type SortDirection = 'asc' | 'desc' | null;

const createNoteEditSchema = (t: ReturnType<typeof useLingui>['t']) =>
  z.object({
    content: z
      .string()
      .nonempty(t`Note content is required`)
      .max(2000, t`Note content must be at most 1000 characters`),
    followUp: z.boolean().optional(),
    interactionTime: z.date().optional().nullable(),
    nextAction: z.string().optional(),
    nextActionTime: z.date().optional().nullable(),
  });

type NoteEditFormValues = z.infer<ReturnType<typeof createNoteEditSchema>>;

interface NoteListProps {
  subjectRef: NoteSubjectRef;
  embedded?: boolean;
  refreshTrigger?: number;
}

export const NoteList: React.FC<NoteListProps> = ({
  subjectRef,
  embedded = false,
  refreshTrigger,
}) => {
  const { t } = useLingui();

  // TanStack Query hooks
  const { data: notes = [], isLoading, error, refetch } = useNotes({ subjectRef });
  const deleteMutation = useNoteDelete(subjectRef);
  const updateMutation = useNoteUpdate(subjectRef);
  const { toggle: toggleFollowUp } = useNoteFollowUpToggle(subjectRef);

  // Local UI state
  const [creatorFilter, setCreatorFilter] = useState<string>('');
  const [nextActionTimeRange, setNextActionTimeRange] = useState<DateRange | undefined>();
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<NoteItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<NoteItem | null>(null);

  // Memoized schema
  const noteEditSchema = useMemo(() => createNoteEditSchema(t), [t]);

  // Refetch when refreshTrigger changes (for external refresh requests)
  useMemo(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Handlers - memoized with useCallback
  const handleDeleteClick = useCallback((note: NoteItem) => {
    setNoteToDelete(note);
    setDeleteDialogOpen(true);
  }, []);

  const handleEditClick = useCallback((note: NoteItem) => {
    setNoteToEdit(note);
    setEditDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!noteToDelete?.metadata?.name) return;

    try {
      await deleteMutation.mutateAsync(noteToDelete.metadata.name);
      toast.success(t`Note deleted successfully`);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  }, [noteToDelete, deleteMutation, t]);

  const handleEditSubmit = useCallback(
    async (value: NoteEditFormValues) => {
      if (!noteToEdit?.metadata?.name) return;

      try {
        await updateMutation.mutateAsync({
          noteName: noteToEdit.metadata.name,
          input: {
            content: value.content,
            followUp: value.followUp,
            ...(value.interactionTime && { interactionTime: value.interactionTime.toISOString() }),
            ...(value.nextAction !== undefined && { nextAction: value.nextAction }),
            ...(value.nextActionTime && { nextActionTime: value.nextActionTime.toISOString() }),
          },
        });

        toast.success(t`Note updated successfully`);
        setEditDialogOpen(false);
      } catch (error) {
        console.error('Failed to update note:', error);
      }
    },
    [noteToEdit, updateMutation, t]
  );

  const handleFollowUpToggle = useCallback(
    async (note: NoteItem, checked: boolean) => {
      if (!note.metadata?.name) return;

      try {
        await toggleFollowUp(note.metadata.name, checked);
        toast.success(t`Follow-up status updated`);
      } catch (error) {
        console.error('Failed to update follow-up status:', error);
      }
    },
    [toggleFollowUp, t]
  );

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        // Cycle through: desc -> asc -> null -> desc
        if (sortDirection === 'desc') {
          setSortDirection('asc');
        } else if (sortDirection === 'asc') {
          setSortDirection(null);
        } else {
          setSortDirection('desc');
        }
      } else {
        setSortField(field);
        setSortDirection('desc');
      }
    },
    [sortField, sortDirection]
  );

  const getSortIcon = useCallback(
    (field: SortField) => {
      if (sortField !== field || sortDirection === null) {
        return <ArrowUpDown className="ml-1 inline h-4 w-4 opacity-50" />;
      }
      return sortDirection === 'desc' ? (
        <ArrowDown className="ml-1 inline h-4 w-4" />
      ) : (
        <ArrowUp className="ml-1 inline h-4 w-4" />
      );
    },
    [sortField, sortDirection]
  );

  // Get unique creators for the filter dropdown
  const uniqueCreators = useMemo(() => {
    const creators = new Set(
      notes.map((note) => note.status?.createdBy).filter((creator): creator is string => !!creator)
    );
    return Array.from(creators);
  }, [notes]);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    let result = notes.filter((note) => {
      // Filter by creator
      if (creatorFilter && creatorFilter !== 'all' && note.status?.createdBy !== creatorFilter) {
        return false;
      }
      // Filter by next action time range
      if (nextActionTimeRange?.from || nextActionTimeRange?.to) {
        if (!note.spec?.nextActionTime) {
          return false; // Exclude notes without nextActionTime if filter is set
        }
        const noteDate = new Date(note.spec.nextActionTime);
        if (nextActionTimeRange.from && noteDate < nextActionTimeRange.from) {
          return false;
        }
        if (nextActionTimeRange.to && noteDate > nextActionTimeRange.to) {
          return false;
        }
      }
      return true;
    });

    // Sort notes
    if (sortDirection !== null) {
      result = [...result].sort((a, b) => {
        let dateA: Date | null = null;
        let dateB: Date | null = null;

        if (sortField === 'created') {
          dateA = a.metadata?.creationTimestamp ? new Date(a.metadata.creationTimestamp) : null;
          dateB = b.metadata?.creationTimestamp ? new Date(b.metadata.creationTimestamp) : null;
        } else if (sortField === 'interactionTime') {
          dateA = a.spec?.interactionTime ? new Date(a.spec.interactionTime) : null;
          dateB = b.spec?.interactionTime ? new Date(b.spec.interactionTime) : null;
        } else if (sortField === 'nextActionTime') {
          dateA = a.spec?.nextActionTime ? new Date(a.spec.nextActionTime) : null;
          dateB = b.spec?.nextActionTime ? new Date(b.spec.nextActionTime) : null;
        }

        // Handle null values - push nulls to the end
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;

        const comparison = dateA.getTime() - dateB.getTime();
        return sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [notes, creatorFilter, nextActionTimeRange, sortField, sortDirection]);

  const content = (
    <>
      {/* Delete Confirmation Dialog */}
      <DialogConfirm
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t`Delete Note`}
        description={t`Are you sure you want to delete this note? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />

      {/* Edit Note Dialog */}
      {noteToEdit && (
        <DialogForm
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          title={t`Edit Note`}
          submitText={updateMutation.isPending ? t`Saving...` : t`Save`}
          cancelText={t`Cancel`}
          schema={noteEditSchema}
          defaultValues={{
            content: String(noteToEdit.spec?.content || ''),
            followUp: noteToEdit.spec?.followUp ?? false,
            interactionTime: noteToEdit.spec?.interactionTime
              ? new Date(noteToEdit.spec.interactionTime)
              : null,
            nextAction: noteToEdit.spec?.nextAction || '',
            nextActionTime: noteToEdit.spec?.nextActionTime
              ? new Date(noteToEdit.spec.nextActionTime)
              : null,
          }}
          onSubmit={handleEditSubmit}>
          {() => (
            <>
              <Form.Textarea
                field="content"
                label={t`Note`}
                placeholder={t`Enter your note here...`}
                required
                rows={4}
              />

              <Form.Checkbox field="followUp" label={t`Follow Up Required`} />

              <Form.DateTimePicker
                field="interactionTime"
                label={t`Interaction Time`}
                placeholder={t`Pick a date and time`}
                modal
              />

              <Form.Input
                field="nextAction"
                label={t`Next Action`}
                placeholder={t`What's the next follow-up action?`}
              />

              <Form.DateTimePicker
                field="nextActionTime"
                label={t`Next Action Time`}
                placeholder={t`Pick a date and time`}
                modal
              />
            </>
          )}
        </DialogForm>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="min-w-[200px]">
          <label className="mb-1 block text-sm font-medium">
            <Trans>Filter by Creator</Trans>
          </label>
          <Select value={creatorFilter} onValueChange={setCreatorFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t`All creators`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <Trans>All creators</Trans>
              </SelectItem>
              {uniqueCreators.map((creator) => (
                <SelectItem key={creator} value={creator}>
                  {creator}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            <Trans>Filter by Next Action Time</Trans>
          </label>
          <DateRangePicker
            value={nextActionTimeRange}
            onValueChange={setNextActionTimeRange}
            placeholder={t`Select date range`}
            defaultPresets
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-8 text-center">
          <Text textColor="muted">
            <Trans>Loading notes...</Trans>
          </Text>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="py-8 text-center">
          <Text textColor="destructive">
            <Trans>Error loading notes: {error.message}</Trans>
          </Text>
        </div>
      )}

      {/* Notes Table */}
      {!isLoading && !error && (
        <div className="w-full overflow-x-auto">
          <Table style={{ minWidth: 900, tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: 40 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 150 }} />
              <col style={{ minWidth: 150 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 70 }} />
              <col style={{ width: 70 }} />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('created')}>
                  <Trans>Created</Trans>
                  {getSortIcon('created')}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('interactionTime')}>
                  <Trans>Interaction Time</Trans>
                  {getSortIcon('interactionTime')}
                </TableHead>
                <TableHead>
                  <Trans>Content</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Next Action</Trans>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('nextActionTime')}>
                  <Trans>Next Action Time</Trans>
                  {getSortIcon('nextActionTime')}
                </TableHead>
                <TableHead className="text-center">
                  <Trans>Follow Up</Trans>
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    <Text textColor="muted">
                      <Trans>No notes found</Trans>
                    </Text>
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotes.map((note) => (
                  <NoteRow
                    key={note.metadata?.name}
                    note={note}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onFollowUpToggle={handleFollowUpToggle}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card className="mt-4 shadow-none">
      <CardHeader>
        <CardTitle>
          <Trans>Notes</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};

// Extracted row component for better performance and memoization
interface NoteRowProps {
  note: NoteItem;
  onEdit: (note: NoteItem) => void;
  onDelete: (note: NoteItem) => void;
  onFollowUpToggle: (note: NoteItem, checked: boolean) => void;
}

const NoteRow: React.FC<NoteRowProps> = ({ note, onEdit, onDelete, onFollowUpToggle }) => {
  const { t } = useLingui();

  return (
    <TableRow>
      <TableCell>
        <Tooltip message={t`Created by: ${note.status?.createdBy || 'Unknown'}`}>
          <Info size={16} className="text-muted-foreground cursor-help" aria-label={t`Note info`} />
        </Tooltip>
      </TableCell>
      <TableCell>
        {note.metadata?.creationTimestamp ? (
          <DateFormatter
            date={note.metadata.creationTimestamp}
            format="MMM d, yyyy HH:mm"
            withGMT={false}
          />
        ) : (
          <Text size="sm" textColor="muted">
            —
          </Text>
        )}
      </TableCell>
      <TableCell>
        {note.spec?.interactionTime ? (
          <DateFormatter
            date={note.spec.interactionTime}
            format="MMM d, yyyy HH:mm"
            withGMT={false}
          />
        ) : (
          <Text size="sm" textColor="muted">
            —
          </Text>
        )}
      </TableCell>
      <TableCell className="overflow-hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Tooltip message={String(note.spec?.content || '')}>
            <Text size="sm" className="block min-w-0 flex-1 cursor-default truncate">
              {String(note.spec?.content || '')}
            </Text>
          </Tooltip>
          <ButtonCopy value={String(note.spec?.content || '')} tooltipText={t`Copy note`} />
        </div>
      </TableCell>
      <TableCell className="overflow-hidden">
        {note.spec?.nextAction ? (
          <div className="flex min-w-0 items-center gap-2">
            <Tooltip message={note.spec.nextAction}>
              <Text size="sm" className="block min-w-0 flex-1 cursor-default truncate">
                {note.spec.nextAction}
              </Text>
            </Tooltip>
            <ButtonCopy value={note.spec.nextAction} tooltipText={t`Copy next action`} />
          </div>
        ) : (
          <Text size="sm" textColor="muted">
            —
          </Text>
        )}
      </TableCell>
      <TableCell>
        {note.spec?.nextActionTime ? (
          <DateFormatter
            date={note.spec.nextActionTime}
            format="MMM d, yyyy HH:mm"
            withGMT={false}
          />
        ) : (
          <Text size="sm" textColor="muted">
            —
          </Text>
        )}
      </TableCell>
      <TableCell className="text-center">
        <Checkbox
          checked={note.spec?.followUp ?? false}
          onCheckedChange={(checked) => onFollowUpToggle(note, checked === true)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Tooltip message={t`Edit note`}>
            <Button theme="borderless" size="icon" onClick={() => onEdit(note)}>
              <Pencil size={16} />
            </Button>
          </Tooltip>
          <Tooltip message={t`Delete note`}>
            <Button type="danger" theme="borderless" size="icon" onClick={() => onDelete(note)}>
              <Trash2 size={16} />
            </Button>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
};
