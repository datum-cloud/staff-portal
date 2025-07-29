import { BadgeState } from '@/components/badge';
import { DateFormatter } from '@/components/date';
import { DateRangePicker } from '@/components/date';
import { Tooltip } from '@/components/tooltip';
import { Text } from '@/components/typography';
import {
  DataTable,
  DataTableProvider,
  filterConfigs,
  useDataTableQuery,
} from '@/modules/data-table';
import { ActivityLogEntry } from '@/modules/loki';
import { Input } from '@/modules/shadcn/ui/input';
import { activityListQuery } from '@/resources/request/client/activity.request';
import { ProjectActivityListResponse } from '@/resources/schemas/activity.schema';
import { Trans, useLingui } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { formatDistanceToNowStrict, fromUnixTime, getUnixTime, subDays } from 'date-fns';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ListActivityProps {
  projectName?: string;
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
    cell: ({ getValue }) => <span>{getValue() || '-'}</span>,
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

export default function ListActivity({
  projectName,
  queryKeyPrefix = ['activity'],
  searchPlaceholder,
  timeRangePlaceholder,
}: ListActivityProps) {
  const { t } = useLingui();
  const [searchInput, setSearchInput] = useState('');

  const tableState = useDataTableQuery<ProjectActivityListResponse>({
    queryKeyPrefix,
    fetchFn: (args) => {
      // If no date filters are set, default to last 7 days
      const defaultStartDate = getUnixTime(subDays(new Date(), 7)) * 1000000000; // Convert to nanoseconds
      const filters = {
        ...args.filters,
        start: args.filters?.start || defaultStartDate,
      };

      return activityListQuery(projectName || null, {
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
    <DataTableProvider<ActivityLogEntry, ProjectActivityListResponse>
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
            placeholder={timeRangePlaceholder || t`Filter by time range`}
          />
        </div>

        <DataTable<ActivityLogEntry> />
      </div>
    </DataTableProvider>
  );
}
