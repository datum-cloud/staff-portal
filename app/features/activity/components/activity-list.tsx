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
import { Link } from 'react-router';

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
      id: 'tenant',
      header: () => <Trans>Tenant</Trans>,
      cell: ({ row }) => {
        const event = row.original as any;

        // Try multiple ways to access annotations
        let annotations = event.annotations || event.Annotations || {};

        // Try nested access if needed
        if (typeof annotations !== 'object' || annotations === null) {
          annotations = {};
        }

        const scopeName =
          annotations['platform.miloapis.com/scope.name'] ||
          annotations['platform.miloapis.com/scope-name'] ||
          annotations['platformMiloapisComScopeName'] ||
          (event.objectRef?.namespace ? event.objectRef.namespace : '-');

        const scopeType =
          annotations['platform.miloapis.com/scope.type'] ||
          annotations['platform.miloapis.com/scope-type'] ||
          annotations['platformMiloapisComScopeType'] ||
          (event.objectRef?.resource ? event.objectRef.resource : '-');

        const getTenantLink = () => {
          if (!scopeName || scopeName === '-') return null;

          const normalizedType = scopeType?.toLowerCase().trim() || '';

          if (normalizedType.includes('organization')) {
            return `/customers/organizations/${scopeName}`;
          } else if (normalizedType.includes('project')) {
            return `/customers/projects/${scopeName}`;
          } else if (normalizedType.includes('user')) {
            return `/customers/users/${scopeName}`;
          } else if (normalizedType === 'global' || normalizedType === '-') {
            return null;
          }
          // Default: try to guess based on common patterns
          return null;
        };

        const tenantLink = getTenantLink();

        return (
          <div className="flex flex-col gap-1">
            {tenantLink ? (
              <Link
                to={tenantLink}
                className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                {scopeName}
              </Link>
            ) : (
              <span>{scopeName}</span>
            )}
            <span className="text-xs font-bold text-gray-600">{scopeType}</span>
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
        const resourceName = event.objectRef?.name || '-';
        return <span>{resourceName}</span>;
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

  // Create filterConfig with default "Last 7 days" values and modification-only actions
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
      actions: {
        defaultValue: 'create,update,patch,delete,deletecollection',
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
              (
                (tableState.filters.actions as string | undefined) ||
                activityFilterConfig.actions.defaultValue
              )
                ?.split(',')
                .filter(Boolean) ?? []
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

          <DataTableFacetFilter
            label={t`Response Code`}
            placeholder={t`Filter by response code`}
            multiSelect
            options={[
              { value: '200', label: t`200 - OK` },
              { value: '201', label: t`201 - Created` },
              { value: '204', label: t`204 - No Content` },
              { value: '400', label: t`400 - Bad Request` },
              { value: '401', label: t`401 - Unauthorized` },
              { value: '403', label: t`403 - Forbidden` },
              { value: '404', label: t`404 - Not Found` },
              { value: '409', label: t`409 - Conflict` },
              { value: '500', label: t`500 - Server Error` },
            ]}
            value={
              (tableState.filters.responseCode as string | undefined)?.split(',').filter(Boolean) ??
              []
            }
            onValueChange={(value) => {
              if (value && Array.isArray(value) && value.length > 0) {
                tableState.setFilter('responseCode', value.join(','));
              } else {
                tableState.clearFilter('responseCode');
              }
            }}
          />

          <DataTableFacetFilter
            label={t`Resource Type`}
            placeholder={t`Filter by resource type`}
            multiSelect
            options={[
              { value: 'dnszones', label: t`DNS Zone` },
              { value: 'dnsrecords', label: t`DNS Record` },
              { value: 'dnsrecordsets', label: t`DNS Record Set` },
              { value: 'httpproxies', label: t`HTTP Proxy` },
              { value: 'domains', label: t`Domain` },
              { value: 'projects', label: t`Project` },
              { value: 'users', label: t`User` },
              { value: 'groups', label: t`Group` },
              { value: 'roles', label: t`Role` },
              { value: 'secrets', label: t`Secret` },
              { value: 'invitations', label: t`Invitation` },
              { value: 'members', label: t`Member` },
              { value: 'namespaces', label: t`Namespace` },
              { value: 'organizations', label: t`Organization` },
              { value: 'exportpolicies', label: t`Export Policy` },
            ]}
            value={
              (tableState.filters.resourceType as string | undefined)?.split(',').filter(Boolean) ??
              []
            }
            onValueChange={(value) => {
              if (value && Array.isArray(value) && value.length > 0) {
                tableState.setFilter('resourceType', value.join(','));
              } else {
                tableState.clearFilter('resourceType');
              }
            }}
          />

          <DataTableFacetFilter
            label={t`API Group`}
            placeholder={t`Filter by API group`}
            multiSelect
            options={[
              { value: 'dns.miloapis.com', label: 'dns.miloapis.com' },
              { value: 'resourcemanager.miloapis.com', label: 'resourcemanager.miloapis.com' },
            ]}
            value={
              (tableState.filters.apiGroup as string | undefined)?.split(',').filter(Boolean) ?? []
            }
            onValueChange={(value) => {
              if (value && Array.isArray(value) && value.length > 0) {
                tableState.setFilter('apiGroup', value.join(','));
              } else {
                tableState.clearFilter('apiGroup');
              }
            }}
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
            responseCode: t`Response Code`,
            resourceType: t`Resource Type`,
            apiGroup: t`API Group`,
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

            // Format response code filter
            if (key === 'responseCode') {
              const codeLabels: Record<string, string> = {
                '200': t`200 - OK`,
                '201': t`201 - Created`,
                '204': t`204 - No Content`,
                '400': t`400 - Bad Request`,
                '401': t`401 - Unauthorized`,
                '403': t`403 - Forbidden`,
                '404': t`404 - Not Found`,
                '409': t`409 - Conflict`,
                '500': t`500 - Server Error`,
              };
              const codes = String(value).split(',').filter(Boolean);
              return codes.map((code) => codeLabels[code] || code).join(', ');
            }

            // Format resource type filter
            if (key === 'resourceType') {
              const resourceLabels: Record<string, string> = {
                dnszones: t`DNS Zone`,
                dnsrecords: t`DNS Record`,
                dnsrecordsets: t`DNS Record Set`,
                httpproxies: t`HTTP Proxy`,
                domains: t`Domain`,
                projects: t`Project`,
                users: t`User`,
                groups: t`Group`,
                roles: t`Role`,
                secrets: t`Secret`,
                invitations: t`Invitation`,
                members: t`Member`,
                namespaces: t`Namespace`,
                organizations: t`Organization`,
                exportpolicies: t`Export Policy`,
              };
              const resources = String(value).split(',').filter(Boolean);
              return resources.map((resource) => resourceLabels[resource] || resource).join(', ');
            }

            return String(value);
          }}
          multiValueFilters={['actions', 'responseCode', 'resourceType', 'apiGroup']}
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

            if (filterKey === 'responseCode') {
              const codeLabels: Record<string, string> = {
                '200': t`200 - OK`,
                '201': t`201 - Created`,
                '204': t`204 - No Content`,
                '400': t`400 - Bad Request`,
                '401': t`401 - Unauthorized`,
                '403': t`403 - Forbidden`,
                '404': t`404 - Not Found`,
                '409': t`409 - Conflict`,
                '500': t`500 - Server Error`,
              };
              return codeLabels[itemValue] || itemValue;
            }

            if (filterKey === 'resourceType') {
              const resourceLabels: Record<string, string> = {
                dnszones: t`DNS Zone`,
                dnsrecords: t`DNS Record`,
                dnsrecordsets: t`DNS Record Set`,
                httpproxies: t`HTTP Proxy`,
                domains: t`Domain`,
                projects: t`Project`,
                users: t`User`,
                groups: t`Group`,
                roles: t`Role`,
                secrets: t`Secret`,
                invitations: t`Invitation`,
                members: t`Member`,
                namespaces: t`Namespace`,
                organizations: t`Organization`,
                exportpolicies: t`Export Policy`,
              };
              return resourceLabels[itemValue] || itemValue;
            }

            return itemValue;
          }}
          onClearFilterItem={(filterKey, itemValue) => {
            const multiFilterKeys = ['actions', 'responseCode', 'resourceType', 'apiGroup'];
            if (multiFilterKeys.includes(filterKey)) {
              const currentValues =
                (
                  tableState.filters[filterKey as keyof typeof tableState.filters] as
                    | string
                    | undefined
                )
                  ?.split(',')
                  .filter(Boolean) || [];
              const remainingValues = currentValues.filter((v) => v.trim() !== itemValue);
              if (remainingValues.length > 0) {
                tableState.setFilter(filterKey, remainingValues.join(','));
              } else {
                tableState.clearFilter(filterKey);
              }
            }
          }}
        />

        <DataTable<ActivityLogEntry> />
      </div>
    </DataTableProvider>
  );
}
