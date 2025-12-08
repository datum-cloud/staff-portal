import { DateFormatter } from '@/components/date';
import { Label } from '@/modules/shadcn/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/modules/shadcn/ui/select';
import { Switch } from '@/modules/shadcn/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/shadcn/ui/table';
import { useApp } from '@/providers/app.provider';
import { ListFollowUpNotesQuery } from '@/resources/graphql/gen/graphql';
import { followUpNotesListQuery } from '@/resources/request/client/note.request';
import { routes } from '@/utils/config/routes.config';
import { Button } from '@datum-ui/button';
import { Tooltip } from '@datum-ui/tooltip';
import { Text } from '@datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

// Extract the note item type from the GraphQL response
type FollowUpNoteItem = NonNullable<
  NonNullable<ListFollowUpNotesQuery['listCrmMiloapisComV1alpha1Note']>['items'][number]
>;

type CreatorFilterValue = 'mine' | 'all';
type SortField = 'created' | 'nextActionTime';
type SortDirection = 'asc' | 'desc' | null;

export const FollowUpsList: React.FC = () => {
  const { t } = useLingui();
  const { user } = useApp();
  const [notes, setNotes] = useState<FollowUpNoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatorFilter, setCreatorFilter] = useState<CreatorFilterValue>('mine');
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('nextActionTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Get the user email for filtering
  const userEmail = user?.spec?.email;

  // Fetch follow-up notes based on creator filter
  useEffect(() => {
    const loadNotes = async () => {
      setLoading(true);
      setError(null);
      try {
        // Determine createdBy filter for the query
        // 'mine' = filter by current user's email
        // 'all' = no filter (undefined)
        const createdBy = creatorFilter === 'mine' && userEmail ? userEmail : undefined;

        const response = await followUpNotesListQuery({ createdBy });
        const items = response.listCrmMiloapisComV1alpha1Note?.items || [];
        setNotes(items.filter((item): item is FollowUpNoteItem => item != null));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load follow-ups');
        console.error('Error fetching follow-ups:', err);
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, [creatorFilter, userEmail]);

  // Check if a note is expired (past due)
  const isExpired = (nextActionTime: string | null | undefined): boolean => {
    if (!nextActionTime) return false;
    return new Date(nextActionTime) < new Date();
  };

  // Handle sort column click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null -> asc
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon for a column
  const getSortIcon = (field: SortField) => {
    if (sortField !== field || sortDirection === null) {
      return <ArrowUpDown className="ml-1 inline h-4 w-4 opacity-50" />;
    }
    return sortDirection === 'desc' ? (
      <ArrowDown className="ml-1 inline h-4 w-4" />
    ) : (
      <ArrowUp className="ml-1 inline h-4 w-4" />
    );
  };

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    let result = notes;

    // Filter by expired status
    if (showExpiredOnly) {
      result = result.filter((note) => isExpired(note.spec?.nextActionTime));
    }

    // Sort notes
    if (sortDirection !== null) {
      result = [...result].sort((a, b) => {
        let dateA: Date | null = null;
        let dateB: Date | null = null;

        if (sortField === 'created') {
          dateA = a.metadata?.creationTimestamp ? new Date(a.metadata.creationTimestamp) : null;
          dateB = b.metadata?.creationTimestamp ? new Date(b.metadata.creationTimestamp) : null;
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
  }, [notes, showExpiredOnly, sortField, sortDirection]);

  // Build URL for the subject (User or Contact)
  const getSubjectUrl = (note: FollowUpNoteItem): string | null => {
    const subjectRef = note.spec?.subjectRef;
    if (!subjectRef) return null;

    if (subjectRef.kind === 'User') {
      return routes.users.detail(subjectRef.name);
    } else if (subjectRef.kind === 'Contact') {
      return routes.contacts.edit(subjectRef.namespace || 'default', subjectRef.name);
    }
    return null;
  };

  // Open subject in new tab
  const handleOpenSubject = (note: FollowUpNoteItem) => {
    const url = getSubjectUrl(note);
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-[200px]">
          <Label className="mb-1 block text-sm font-medium">
            <Trans>Show</Trans>
          </Label>
          <Select
            value={creatorFilter}
            onValueChange={(value) => setCreatorFilter(value as CreatorFilterValue)}>
            <SelectTrigger>
              <SelectValue placeholder={t`Select creator`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mine">
                <Trans>My follow-ups</Trans>
              </SelectItem>
              <SelectItem value="all">
                <Trans>All follow-ups</Trans>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 pt-5">
          <Switch
            id="expired-filter"
            checked={showExpiredOnly}
            onCheckedChange={setShowExpiredOnly}
          />
          <Label htmlFor="expired-filter" className="cursor-pointer">
            <Trans>Show expired only</Trans>
          </Label>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-8 text-center">
          <Text textColor="muted">
            <Trans>Loading follow-ups...</Trans>
          </Text>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="py-8 text-center">
          <Text textColor="destructive">
            <Trans>Error loading follow-ups: {error}</Trans>
          </Text>
        </div>
      )}

      {/* Notes Table */}
      {!loading && !error && (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('created')}>
                  <Trans>Created</Trans>
                  {getSortIcon('created')}
                </TableHead>
                {creatorFilter === 'all' && (
                  <TableHead>
                    <Trans>Created By</Trans>
                  </TableHead>
                )}
                <TableHead>
                  <Trans>Subject Type</Trans>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('nextActionTime')}>
                  <Trans>Next Action Time</Trans>
                  {getSortIcon('nextActionTime')}
                </TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={creatorFilter === 'all' ? 5 : 4} className="text-center">
                    <Text textColor="muted">
                      <Trans>No follow-ups found</Trans>
                    </Text>
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotes.map((note, index) => (
                  <TableRow key={note.metadata?.name || `note-${index}`}>
                    <TableCell>
                      {note.metadata?.creationTimestamp ? (
                        <DateFormatter
                          date={note.metadata.creationTimestamp}
                          format="MMM d, yyyy"
                          withGMT={false}
                        />
                      ) : (
                        <Text size="sm" textColor="muted">
                          —
                        </Text>
                      )}
                    </TableCell>
                    {creatorFilter === 'all' && (
                      <TableCell>
                        <Text size="sm">{note.status?.createdBy || '—'}</Text>
                      </TableCell>
                    )}
                    <TableCell>
                      <Text size="sm">{note.spec?.subjectRef?.kind || '—'}</Text>
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
                    <TableCell>
                      {getSubjectUrl(note) && (
                        <Tooltip
                          message={
                            note.spec?.subjectRef?.kind === 'User'
                              ? t`Open User in new tab`
                              : t`Open Contact in new tab`
                          }>
                          <Button
                            theme="borderless"
                            size="icon"
                            onClick={() => handleOpenSubject(note)}>
                            <ExternalLink size={16} />
                          </Button>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Footer with count */}
      {!loading && !error && (
        <div className="text-muted-foreground text-sm">
          <Trans>
            {showExpiredOnly
              ? `Showing ${filteredNotes.length} expired of ${notes.length} follow-ups`
              : `Showing ${filteredNotes.length} follow-ups`}
          </Trans>
        </div>
      )}
    </div>
  );
};
