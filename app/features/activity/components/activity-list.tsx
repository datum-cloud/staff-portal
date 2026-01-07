import { BadgeState } from '@/components/badge';
import { DateTime, DateRangePicker } from '@/components/date';
import { ActivityLogEntry } from '@/modules/loki';
import { useApp } from '@/providers/app.provider';
import { activityListQuery } from '@/resources/request/client';
import { ActivityListResponse, ActivityQueryParams } from '@/resources/schemas';
import {
  DataTable,
  DataTableActiveFilters,
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
  format,
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
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useCallback, useMemo } from 'react';

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
      <Tooltip message={<DateTime date={getValue()} />}>
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
  const { settings } = useApp();

  // Helper functions for timezone conversion
  const convertFromApiTimestamp = (timestamp: string) => {
    const utcDate = fromUnixTime(parseInt(timestamp) / 1000000000);
    const timeZone = settings?.timezone;
    return timeZone && timeZone !== 'Etc/GMT' ? fromZonedTime(utcDate, timeZone) : utcDate;
  };

  const convertToApiTimestamp = useCallback(
    (date: Date) => {
      const timeZone = settings?.timezone;
      const utcDate = timeZone && timeZone !== 'Etc/GMT' ? toZonedTime(date, timeZone) : date;
      return getUnixTime(utcDate) * 1000000000;
    },
    [settings?.timezone]
  );

  // Create filterConfig with default "Last 7 days" values
  const activityFilterConfig = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    return {
      start: {
        defaultValue: convertToApiTimestamp(sevenDaysAgo),
      },
      end: {
        defaultValue: convertToApiTimestamp(now),
      },
    };
  }, [convertToApiTimestamp]);

  const tableState = useDataTableQuery<ActivityListResponse>({
    queryKeyPrefix,
    fetchFn: (args) => {
      const filters: ActivityQueryParams = {
        ...args.filters,
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
    filterConfig: activityFilterConfig,
  });

  return (
    <DataTableProvider<ActivityLogEntry, ActivityListResponse>
      columns={createColumns()}
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
            showClearButton={false}
            value={{
              from: tableState.filters.start
                ? convertFromApiTimestamp(String(tableState.filters.start))
                : undefined,
              to: tableState.filters.end
                ? convertFromApiTimestamp(String(tableState.filters.end))
                : undefined,
            }}
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

        <DataTableActiveFilters
          filters={tableState.filters}
          filterConfig={activityFilterConfig}
          search={tableState.search}
          onClearFilter={tableState.clearFilter}
          onClearAllFilters={tableState.clearAllFilters}
          onClearSearch={tableState.clearSearch}
          filterLabels={{
            timeRange: t`Time range`,
            actions: t`Actions`,
          }}
          filterGroups={{
            timeRange: ['start', 'end'],
          }}
          excludeFilters={['search', 'timeRange']}
          formatFilterValue={(key, value) => {
            // Format actions filter
            if (key === 'actions') {
              const actionLabels: Record<string, string> = {
                get: t`Get`,
                list: t`List`,
                watch: t`Watch`,
                create: t`Create`,
                update: t`Update`,
                patch: t`Patch`,
                delete: t`Delete`,
                deletecollection: t`Delete Collection`,
              };
              const actions = String(value).split(',').filter(Boolean);
              return actions.map((action) => actionLabels[action] || action).join(', ');
            }

            return String(value);
          }}
          multiValueFilters={['actions']}
          formatFilterItem={(filterKey, itemValue) => {
            if (filterKey === 'actions') {
              const actionLabels: Record<string, string> = {
                get: t`Get`,
                list: t`List`,
                watch: t`Watch`,
                create: t`Create`,
                update: t`Update`,
                patch: t`Patch`,
                delete: t`Delete`,
                deletecollection: t`Delete Collection`,
              };
              return actionLabels[itemValue] || itemValue;
            }
            return itemValue;
          }}
          onClearFilterItem={(filterKey, itemValue) => {
            if (filterKey === 'actions') {
              const currentActions =
                (tableState.filters.actions as string | undefined)?.split(',').filter(Boolean) ||
                [];
              const remainingActions = currentActions.filter(
                (action) => action.trim() !== itemValue
              );
              if (remainingActions.length > 0) {
                tableState.setFilter('actions', remainingActions.join(','));
              } else {
                tableState.clearFilter('actions');
              }
            }
          }}
        />

        <DataTable<ActivityLogEntry> />
      </div>
    </DataTableProvider>
  );
}
