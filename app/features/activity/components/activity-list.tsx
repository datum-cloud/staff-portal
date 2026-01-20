import { DateRangePicker, DateTime } from '@/components/date';
import { Badge } from '@/modules/shadcn/ui/badge';
import { useApp } from '@/providers/app.provider';
import { activityListQuery } from '@/resources/request/client';
import { ActivityListResponse, ActivityLogEntry, ActivityQueryParams } from '@/resources/schemas';
import {
  DataTable,
  DataTableActiveFilters,
  DataTableFacetFilter,
  DataTableProvider,
  DataTableSearch,
  useDataTableQuery,
} from '@datum-ui/data-table';
import { Trans, useLingui } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
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
import { useCallback, useMemo } from 'react';

interface ActivityListProps {
  resourceType?: string;
  resourceId?: string;
  queryKeyPrefix?: string[];
  searchPlaceholder?: string;
  timeRangePlaceholder?: string;
}

const columnHelper = createColumnHelper<ActivityLogEntry>();

// Resource labels mapping (simplified from reference)
const RESOURCE_LABELS: Record<string, string> = {
  dnszones: 'DNS zone',
  dnsrecords: 'DNS record',
  dnsrecordsets: 'DNS record set',
  httpproxies: 'HTTP proxy',
  domains: 'Domain',
  projects: 'Project',
  users: 'User',
  groups: 'Group',
  roles: 'Role',
  secrets: 'Secret',
  invitations: 'Invitation',
  members: 'Member',
  namespaces: 'Namespace',
  organizations: 'Organization',
  dnszonediscoveries: 'DNS zone discovery',
  exportpolicies: 'Export policy',
};

// Verb past tense mapping
const VERB_PAST_TENSE: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  patch: 'Modified',
  list: 'Listed',
  get: 'Retrieved',
  watch: 'Watched',
};

/**
 * Converts camelCase/PascalCase resource name to title case.
 * Example: "exportPolicies" -> "Export Policy", "dnsZones" -> "DNS Zone"
 */
function formatResourceName(resource: string): string {
  // Remove trailing 's' for plural
  const singular = resource.replace(/s$/, '');

  // Split camelCase/PascalCase and capitalize each word
  const words = singular.replace(/([A-Z])/g, ' $1').split(/[\s-]+/);
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

/**
 * Humanizes an action based on verb and resource.
 */
function humanizeAction(verb: string, resource: string): string {
  const verbText = VERB_PAST_TENSE[verb] || verb.charAt(0).toUpperCase() + verb.slice(1);
  const resourceText = RESOURCE_LABELS[resource] || formatResourceName(resource);

  const article = /^[aeiou]/i.test(resourceText) ? 'an' : 'a';
  return `${verbText} ${article} ${resourceText}`;
}

/**
 * Formats resource details for display.
 */
function formatDetails(resource: string, resourceName: string): string {
  const label = RESOURCE_LABELS[resource] || resource;
  if (!resourceName) {
    return label;
  }
  return `${label}: ${resourceName}`;
}

/**
 * Gets timestamp from event.
 */
function getEventTimestamp(event: ActivityLogEntry): Date {
  const timestamp =
    event.requestReceivedTimestamp || event.stageTimestamp || new Date().toISOString();
  return new Date(timestamp);
}

/**
 * Returns column definitions for the Activity Log table.
 */
function createColumns(user?: { metadata?: { name?: string } }) {
  return [
    columnHelper.display({
      id: 'user',
      header: () => <Trans>User</Trans>,
      cell: ({ row }) => {
        const event = row.original;
        const userName = event.user?.username || '-';
        const userId = event.user?.uid;
        const isCurrentUser = user?.metadata?.name && userId === user.metadata.name;

        return (
          <div className="flex items-center justify-between gap-2">
            <span>{userName}</span>
            {isCurrentUser && <Badge variant="outline">You</Badge>}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'action',
      header: () => <Trans>Action</Trans>,
      size: 180,
      cell: ({ row }) => {
        const event = row.original;
        const verb = event.verb || 'unknown';
        const resource = event.objectRef?.resource || 'resource';
        const action = humanizeAction(verb, resource);
        return <span>{action}</span>;
      },
    }),
    columnHelper.display({
      id: 'details',
      header: () => <Trans>Target</Trans>,
      cell: ({ row }) => {
        const event = row.original;
        const resource = event.objectRef?.resource || 'unknown';
        const resourceName = event.objectRef?.name || '';
        const details = formatDetails(resource, resourceName);
        return <span title={resourceName}>{details}</span>;
      },
    }),
    columnHelper.display({
      id: 'date',
      header: () => <Trans>Date</Trans>,
      size: 150,
      cell: ({ row }) => {
        const event = row.original;
        const timestamp = getEventTimestamp(event);
        return <DateTime date={timestamp} />;
      },
    }),
  ];
}

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
  const { settings, user } = useApp();

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
      columns={createColumns(user || undefined)}
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
