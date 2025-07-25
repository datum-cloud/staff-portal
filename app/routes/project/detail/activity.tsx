import type { Route } from './+types/activity';
import BadgeState from '@/components/badge-state';
import DateFormatter from '@/components/date-formatter';
import { DateTimeRangePicker } from '@/components/date-time-range-picker';
import Tooltip from '@/components/tooltip';
import { Text } from '@/components/typography';
import {
  DataTable,
  DataTableProvider,
  filterConfigs,
  useDataTableQuery,
} from '@/modules/data-table';
import { ActivityLogEntry } from '@/modules/loki';
import { Input } from '@/modules/shadcn/ui/input';
import { projectActivityListQuery } from '@/resources/request/client/project.request';
import { ProjectActivityListResponse } from '@/resources/schemas/activity.schema';
import { Project } from '@/resources/schemas/project.schema';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans, useLingui } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { formatDistanceToNowStrict, fromUnixTime, getUnixTime } from 'date-fns';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouteLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<Project>(matches, 'routes/project/detail/layout');
  return metaObject(`Activity - ${data?.metadata?.name}`);
};

const columnHelper = createColumnHelper<ActivityLogEntry>();

const columns = [
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
            <div dangerouslySetInnerHTML={{ __html: log.formattedMessage }} />
          ) : (
            <p>{log.message}</p>
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

export default function Page() {
  const { t } = useLingui();
  const data = useRouteLoaderData('routes/project/detail/layout') as Project;
  const [searchInput, setSearchInput] = useState('');

  const tableState = useDataTableQuery<ProjectActivityListResponse>({
    queryKeyPrefix: ['projects', data.metadata.name, 'activity'],
    fetchFn: (args) => projectActivityListQuery(data.metadata.name, args),
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
      columns={columns}
      transform={(data) => ({
        rows: data?.data?.logs || [],
        cursor: '',
      })}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <Input
            placeholder={t`Search activity...`}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-64"
          />
          <DateTimeRangePicker
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
            placeholder={t`Filter by time range`}
          />
        </div>

        <DataTable<ActivityLogEntry> />
      </div>
    </DataTableProvider>
  );
}
