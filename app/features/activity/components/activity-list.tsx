import ActivityDetailDrawer from './activity-detail-drawer';
import { BadgeState } from '@/components/badge';
import { DateFormatter, DateRangePicker } from '@/components/date';
import { ActivityLogEntry } from '@/modules/loki';
import { useApp } from '@/providers/app.provider';
import { activityListQuery } from '@/resources/request/client';
import { ActivityListResponse, ActivityQueryParams } from '@/resources/schemas';
import {
  DataTable,
  DataTableFacetFilter,
  DataTableProvider,
  DataTableSearch,
  filterConfigs,
  useDataTableQuery,
} from '@datum-ui/data-table';
import { Tooltip } from '@datum-ui/tooltip';
import { Text } from '@datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  formatDistanceToNowStrict,
  fromUnixTime,
  getUnixTime,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subHours,
  subMinutes,
} from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { AlertTriangle, CheckCircle, Info, XCircle, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ActivityListProps {
  resourceType?: string;
  resourceId?: string;
  queryKeyPrefix?: string[];
  searchPlaceholder?: string;
  timeRangePlaceholder?: string;
}

const columnHelper = createColumnHelper<ActivityLogEntry>();

const createColumns = (onRowClick?: (entry: ActivityLogEntry) => void) => [
  columnHelper.accessor('message', {
    header: () => <Trans>Message</Trans>,
    enableSorting: false,
    size: 500, // Give message column maximum priority
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

          {/* Hidden button for row click handling */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRowClick?.(log);
            }}
            className="hidden"
            type="button"
            aria-hidden="true"
          />
        </div>
      );
    },
  }),
  columnHelper.display({
    id: 'context',
    header: () => <Trans>Context</Trans>,
    size: 200,
    cell: ({ row }) => {
      const log = row.original;

      // Get annotations
      const projectName = log.annotations?.['resourcemanager.miloapis.com/project-name'];
      const organizationName = log.annotations?.['resourcemanager.miloapis.com/organization-name'];
      const controlPlaneType = log.annotations?.['telemetry.miloapis.com/control-plane-type'];

      // Check for Project context
      if (projectName) {
        return (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-600">Project</span>
            <span className="text-sm font-medium text-gray-900">{projectName}</span>
          </div>
        );
      }

      if (controlPlaneType === 'project') {
        return (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-600">Project</span>
          </div>
        );
      }

      // Check for Organization context (only if annotation is present)
      if (organizationName) {
        return (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-600">Organization</span>
            <span className="text-sm font-medium text-gray-900">{organizationName}</span>
          </div>
        );
      }

      // Check for Platform context (core without organization annotation)
      if (controlPlaneType === 'core') {
        return (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-600">Platform</span>
          </div>
        );
      }

      // Fallback
      return <Text textColor="muted">-</Text>;
    },
  }),
  columnHelper.display({
    id: 'sourceIPs',
    header: () => <Trans>Source IP</Trans>,
    size: 150, // Medium priority
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
    size: 100, // Minimal priority - just enough for badge
    cell: ({ getValue }) => <BadgeState state={getValue() || 'info'} />,
  }),
  columnHelper.accessor('timestamp', {
    header: () => <Trans>Timestamp</Trans>,
    size: 140, // Medium-high priority
    cell: ({ getValue }) => (
      <Tooltip message={<DateFormatter date={getValue()} withTime />}>
        <span>{formatDistanceToNowStrict(new Date(getValue()), { addSuffix: true })}</span>
      </Tooltip>
    ),
  }),
  columnHelper.display({
    id: 'status',
    header: () => <Trans>Status</Trans>,
    size: 110, // Minimal priority - just enough for badge
    cell: ({ row }) => {
      const log = row.original;
      if (!log.statusMessage && !log.category) return null;

      // Use category for styling, show status category by default
      // Full statusMessage available in tooltip
      const state = log.category || 'info';

      return <BadgeState state={state} tooltip={log.statusMessage} />;
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
  const { settings } = useApp();
  const [selectedEntry, setSelectedEntry] = useState<ActivityLogEntry | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Helper functions for timezone conversion
  const convertFromApiTimestamp = (timestamp: string) => {
    const utcDate = fromUnixTime(parseInt(timestamp) / 1000000000);
    const timeZone = settings?.timezone;
    return timeZone && timeZone !== 'Etc/GMT' ? fromZonedTime(utcDate, timeZone) : utcDate;
  };

  const convertToApiTimestamp = (date: Date) => {
    const timeZone = settings?.timezone;
    const utcDate = timeZone && timeZone !== 'Etc/GMT' ? toZonedTime(date, timeZone) : date;
    return getUnixTime(utcDate) * 1000000000;
  };

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

  const handleRowClick = (entry: ActivityLogEntry) => {
    setSelectedEntry(entry);
    setIsDetailDialogOpen(true);
  };

  // Add row click handlers using event delegation for row clicks
  const tableWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = tableWrapperRef.current;
    if (!wrapper) return;

    const handleClick = (e: MouseEvent) => {
      const row = (e.target as HTMLElement).closest('tbody tr');
      if (!row) return;

      // Check if click is on a button or link (to avoid double-handling)
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a')) {
        return;
      }

      // Find and click the hidden button in the message cell
      const button = row.querySelector('button[aria-hidden="true"]') as HTMLButtonElement;
      if (button) {
        button.click();
      }
    };

    wrapper.addEventListener('click', handleClick);
    return () => wrapper.removeEventListener('click', handleClick);
  }, []);

  return (
    <>
      <DataTableProvider<ActivityLogEntry, ActivityListResponse>
        columns={createColumns(handleRowClick)}
        transform={(data) => ({
          rows: data?.data?.logs || [],
          cursor: data?.data?.nextPageToken || '',
        })}
        {...tableState}>
        <div className="m-4 flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <DataTableSearch
              placeholder={searchPlaceholder || t`Search activity...`}
              value={tableState.search}
              onValueChange={tableState.setSearch || (() => {})}
            />

            <DateRangePicker
              presets={ACTIVITY_DATE_PRESETS}
              placeholder={timeRangePlaceholder || t`Filter by time range`}
              value={
                tableState.filters.start || tableState.filters.end
                  ? {
                      from: tableState.filters.start
                        ? convertFromApiTimestamp(tableState.filters.start)
                        : undefined,
                      to: tableState.filters.end
                        ? convertFromApiTimestamp(tableState.filters.end)
                        : undefined,
                    }
                  : undefined
              }
              onValueChange={(range) => {
                if (range) {
                  const filters: Record<string, any> = {};
                  if (range.from) filters.start = convertToApiTimestamp(range.from);
                  if (range.to) filters.end = convertToApiTimestamp(range.to);
                  tableState.setFilters(filters);
                } else {
                  tableState.clearAllFilters();
                }
              }}
            />

            <DataTableFacetFilter
              label={t`Actions`}
              placeholder={t`Filter by action`}
              multiSelect
              options={[
                { value: 'get', label: t`Get` },
                { value: 'list', label: t`List` },
                { value: 'watch', label: t`Watch` },
                { value: 'create', label: t`Create` },
                { value: 'update', label: t`Update` },
                { value: 'patch', label: t`Patch` },
                { value: 'delete', label: t`Delete` },
              ]}
              value={
                (tableState.filters.actions as string | undefined)?.split(',').filter(Boolean) ?? []
              }
              onValueChange={(value) => {
                if (value && Array.isArray(value) && value.length > 0) {
                  tableState.setFilter('actions', value.join(','));
                } else {
                  tableState.clearFilter('actions');
                }
              }}
              menuItems={[
                {
                  label: t`All write operations`,
                  onClick: () => {
                    tableState.setFilter('actions', 'create,update,patch,delete,deletecollection');
                  },
                },
                {
                  label: t`All read operations`,
                  onClick: () => {
                    tableState.setFilter('actions', 'get,list,watch');
                  },
                },
              ]}
            />
          </div>

          <div
            ref={tableWrapperRef}
            className="activity-table-wrapper relative cursor-pointer"
            role="region"
            aria-label={t`Activity logs table`}>
            <style>{`
              .activity-table-wrapper tbody tr {
                transition: background-color 0.2s ease;
              }
              .activity-table-wrapper tbody tr:hover {
                background-color: rgba(59, 130, 246, 0.05);
              }
            `}</style>
            {tableState.query.isFetching && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/40 backdrop-blur-sm">
                <Loader2 size={32} className="animate-spin text-blue-600" />
              </div>
            )}
            <DataTable<ActivityLogEntry> />
          </div>
        </div>
      </DataTableProvider>

      <ActivityDetailDrawer
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        entry={selectedEntry}
      />
    </>
  );
}
