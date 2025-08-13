import { BadgeState } from '@/components/badge';
import { DateFormatter, DateRangePicker } from '@/components/date';
import { Tooltip } from '@/components/tooltip';
import { Text } from '@/components/typography';
import {
  DataTable,
  DataTableProvider,
  filterConfigs,
  useDataTableQuery,
} from '@/modules/data-table';
import { ActivityLogEntry } from '@/modules/loki';
import { Button } from '@/modules/shadcn/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/modules/shadcn/ui/dropdown-menu';
import { Input } from '@/modules/shadcn/ui/input';
import { activityListQuery } from '@/resources/request/client';
import { ActivityListResponse, ActivityQueryParams } from '@/resources/schemas';
import { Trans, useLingui } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import {
  formatDistanceToNowStrict,
  fromUnixTime,
  getUnixTime,
  subDays,
  subHours,
  subMinutes,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DateRange } from 'react-day-picker';

interface ActivityListProps {
  resourceType?: string;
  resourceId?: string;
  queryKeyPrefix?: string[];
  searchPlaceholder?: string;
  timeRangePlaceholder?: string;
}

const columnHelper = createColumnHelper<ActivityLogEntry>();

const createColumns = () => [
  columnHelper.accessor('message', {
    header: () => <Trans>Message</Trans>,
    cell: ({ row }) => {
      const log = row.original;
      return (
        <div className="flex gap-2">
          {/* Icon based on category/status */}
          <div className="relative top-[4px]">
            {log.category === 'success' && (
              <CheckCircle size={14} className="flex-shrink-0 text-green-600" />
            )}
            {log.category === 'error' && (
              <XCircle size={14} className="flex-shrink-0 text-red-600" />
            )}
            {log.category === 'warning' && (
              <AlertTriangle size={14} className="flex-shrink-0 text-amber-600" />
            )}
            {log.category === 'info' && <Info size={14} className="flex-shrink-0 text-blue-600" />}
            {!log.category && <Info size={14} className="flex-shrink-0 text-gray-600" />}
          </div>

          {log.formattedMessage ? (
            <div
              className="break-words whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: log.formattedMessage }}
            />
          ) : (
            <p className="break-words whitespace-pre-wrap">{log.message}</p>
          )}
        </div>
      );
    },
  }),
  columnHelper.display({
    id: 'sourceIPs',
    header: () => <Trans>Source IP</Trans>,
    cell: ({ row }) => {
      const log = row.original;
      return (log.sourceIPs ?? []).length > 0 ? (
        <span>{log.sourceIPs?.join(', ')}</span>
      ) : (
        <Text textColor="muted">-</Text>
      );
    },
  }),
  columnHelper.accessor('verb', {
    header: () => <Trans>Action</Trans>,
    cell: ({ getValue }) => <BadgeState state={getValue() || 'info'} />,
  }),
  columnHelper.accessor('timestamp', {
    header: () => <Trans>Timestamp</Trans>,
    cell: ({ getValue }) => (
      <Tooltip message={<DateFormatter date={getValue()} withTime />}>
        <span>{formatDistanceToNowStrict(new Date(getValue()), { addSuffix: true })}</span>
      </Tooltip>
    ),
  }),
  columnHelper.display({
    id: 'status',
    header: () => <Trans>Status</Trans>,
    cell: ({ row }) => {
      const log = row.original;
      if (!log.statusMessage && !log.category) return null;

      // Use category for styling, statusMessage for display text
      const state = log.category || 'info';
      const displayMessage = log.statusMessage || log.category;

      return <BadgeState state={state} message={displayMessage} />;
    },
  }),
];

// Custom presets limited to 30 days or less
const ACTIVITY_DATE_PRESETS = [
  {
    label: 'Last 5 minutes',
    getValue: () => ({ from: subMinutes(new Date(), 5), to: new Date() }),
  },
  {
    label: 'Last 15 minutes',
    getValue: () => ({ from: subMinutes(new Date(), 15), to: new Date() }),
  },
  {
    label: 'Last 30 minutes',
    getValue: () => ({ from: subMinutes(new Date(), 30), to: new Date() }),
  },
  {
    label: 'Last 1 hour',
    getValue: () => ({ from: subHours(new Date(), 1), to: new Date() }),
  },
  {
    label: 'Last 3 hours',
    getValue: () => ({ from: subHours(new Date(), 3), to: new Date() }),
  },
  {
    label: 'Last 6 hours',
    getValue: () => ({ from: subHours(new Date(), 6), to: new Date() }),
  },
  {
    label: 'Last 12 hours',
    getValue: () => ({ from: subHours(new Date(), 12), to: new Date() }),
  },
  {
    label: 'Last 24 hours',
    getValue: () => ({ from: subHours(new Date(), 24), to: new Date() }),
  },
  {
    label: 'Last 2 days',
    getValue: () => ({ from: subDays(new Date(), 2), to: new Date() }),
  },
  {
    label: 'Last 7 days',
    getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }),
  },
  {
    label: 'Last 14 days',
    getValue: () => ({ from: subDays(new Date(), 14), to: new Date() }),
  },
  {
    label: 'Last 30 days',
    getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }),
  },
  {
    label: 'Today',
    getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
  },
  {
    label: 'Today so far',
    getValue: () => ({ from: startOfDay(new Date()), to: new Date() }),
  },
  {
    label: 'This week',
    getValue: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }),
  },
  {
    label: 'This week so far',
    getValue: () => ({ from: startOfWeek(new Date()), to: new Date() }),
  },
  {
    label: 'This month',
    getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  {
    label: 'This month so far',
    getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }),
  },
];

export default function ActivityList({
  resourceType,
  resourceId,
  queryKeyPrefix = ['activity'],
  searchPlaceholder,
  timeRangePlaceholder,
}: ActivityListProps) {
  const { t } = useLingui();
  const [searchInput, setSearchInput] = useState('');

  const tableState = useDataTableQuery<ActivityListResponse>({
    queryKeyPrefix,
    fetchFn: (args) => {
      // If no date filters are set, default to last 7 days
      const defaultStartDate = getUnixTime(subDays(new Date(), 7)) * 1000000000; // Convert to nanoseconds
      const filters: ActivityQueryParams = {
        ...args.filters,
        start: args.filters?.start || defaultStartDate,
      };

      const resource = {
        resourceType,
        resourceId,
      };

      switch (resourceType) {
        case 'project':
          filters.project = resourceId;
          resource.resourceType = undefined;
          resource.resourceId = undefined;
          break;
        case 'organization':
          filters.organization = resourceId;
          resource.resourceType = undefined;
          resource.resourceId = undefined;
          break;
        case 'user':
          filters.user = resourceId;
          resource.resourceType = undefined;
          resource.resourceId = undefined;
          break;
        // TODO: add another resource type
        default:
          // Use regular parameters instead of object
          break;
      }

      return activityListQuery(resource.resourceType, resource.resourceId, {
        ...args,
        filters,
      });
    },
    useSorting: true,
    useFilters: true,
    useSearch: true,
    filterConfig: filterConfigs.dateRange,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      tableState.setSearch?.(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, tableState.setSearch]);

  return (
    <DataTableProvider<ActivityLogEntry, ActivityListResponse>
      columns={createColumns()}
      transform={(data) => ({
        rows: data?.data?.logs || [],
        cursor: '',
      })}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <Input
            placeholder={searchPlaceholder || t`Search activity...`}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-64"
          />
          <DateRangePicker
            presets={ACTIVITY_DATE_PRESETS}
            placeholder={timeRangePlaceholder || t`Filter by time range`}
            value={
              tableState.filters.start || tableState.filters.end
                ? {
                    from: tableState.filters.start
                      ? fromUnixTime(parseInt(tableState.filters.start) / 1000000000)
                      : undefined,
                    to: tableState.filters.end
                      ? fromUnixTime(parseInt(tableState.filters.end) / 1000000000)
                      : undefined,
                  }
                : undefined
            }
            onValueChange={(range) => {
              if (range) {
                const filters: Record<string, any> = {};
                if (range.from) filters.start = getUnixTime(range.from) * 1000000000; // Convert to nanoseconds
                if (range.to) filters.end = getUnixTime(range.to) * 1000000000; // Convert to nanoseconds
                tableState.setFilters(filters);
              } else {
                tableState.clearAllFilters();
              }
            }}
          />

          {/* Actions filter */}
          {(() => {
            const ACTION_OPTIONS = [
              { value: 'get', label: t`Get` },
              { value: 'list', label: t`List` },
              { value: 'watch', label: t`Watch` },
              { value: 'create', label: t`Create` },
              { value: 'update', label: t`Update` },
              { value: 'patch', label: t`Patch` },
              { value: 'delete', label: t`Delete` },
            ] as const;

            const current =
              (tableState.filters.actions as string | undefined)?.split(',').filter(Boolean) ?? [];
            const currentSet = new Set(current);
            const selectedCount = current.length;

            const setActions = (values: string[]) => {
              if (values.length > 0) tableState.setFilter('actions', values.join(','));
              else tableState.clearFilter('actions');
            };

            const toggle = (value: string, checked: boolean) => {
              const next = new Set(currentSet);
              if (checked) next.add(value);
              else next.delete(value);
              setActions(Array.from(next));
            };

            const setWrites = () =>
              setActions(['create', 'update', 'patch', 'delete', 'deletecollection']);
            const setReads = () => setActions(['get', 'list', 'watch']);

            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    {selectedCount > 0
                      ? t`Filter by action (${selectedCount})`
                      : t`Filter by action`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>
                    <Trans>Filter by action</Trans>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {ACTION_OPTIONS.map((opt) => (
                    <DropdownMenuCheckboxItem
                      key={opt.value}
                      checked={currentSet.has(opt.value)}
                      onCheckedChange={(c) => toggle(opt.value, Boolean(c))}>
                      {opt.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={setWrites}>
                    <Trans>All write operations</Trans>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={setReads}>
                    <Trans>All read operations</Trans>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => tableState.clearFilter('actions')}
                    data-variant="destructive">
                    <Trans>Clear</Trans>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()}
        </div>

        <DataTable<ActivityLogEntry> />
      </div>
    </DataTableProvider>
  );
}
