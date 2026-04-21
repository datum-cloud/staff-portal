import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateRangePicker, DateTime } from '@/components/date';
import { useApp } from '@/providers/app.provider';
import { activityListQuery } from '@/resources/request/client';
import { ActivityListResponse, ActivityLogEntry, ActivityQueryParams } from '@/resources/schemas';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  DataTable as DatumDataTable,
  useDataTableFilters,
  useDataTablePagination,
  useDataTableSearch,
  useNuqsAdapter,
} from '@datum-cloud/datum-ui/data-table';
import type { FilterValue, ServerFetchArgs, StateAdapter } from '@datum-cloud/datum-ui/data-table';
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
import { parseAsArrayOf, parseAsString } from 'nuqs';
import { useCallback, useLayoutEffect, useMemo } from 'react';
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
            {isCurrentUser && <Badge theme="outline">You</Badge>}
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

function normalizeActivityFiltersForApi(filters: FilterValue): ActivityQueryParams {
  const out: ActivityQueryParams = {};
  const arrOrCsv = (v: unknown): string | undefined => {
    if (Array.isArray(v) && v.length > 0) return v.filter(Boolean).join(',');
    if (typeof v === 'string' && v.trim() !== '') return v;
    return undefined;
  };
  if (filters.start != null && String(filters.start) !== '') {
    out.start = String(filters.start);
  }
  if (filters.end != null && String(filters.end) !== '') {
    out.end = String(filters.end);
  }
  const actions = arrOrCsv(filters.actions);
  if (actions) out.actions = actions;
  const responseCode = arrOrCsv(filters.responseCode);
  if (responseCode) out.responseCode = responseCode;
  const resourceType = arrOrCsv(filters.resourceType);
  if (resourceType) out.resourceType = resourceType;
  const apiGroup = arrOrCsv(filters.apiGroup);
  if (apiGroup) out.apiGroup = apiGroup;
  return out;
}

function ActivityNuqsHydration({ stateAdapter }: { stateAdapter: StateAdapter }) {
  const { setFilter } = useDataTableFilters();
  const { setSearch } = useDataTableSearch();
  const { setPageIndex, setPageSize } = useDataTablePagination();

  useLayoutEffect(() => {
    const p = stateAdapter.read();
    if (p.search) setSearch(p.search);
    if (p.filters) {
      for (const [key, value] of Object.entries(p.filters)) {
        if (value == null || value === '') continue;
        if (Array.isArray(value) && value.length === 0) continue;
        setFilter(key, value);
      }
    }
    if (p.pageSize != null) setPageSize(p.pageSize);
    if (p.pageIndex != null && p.pageIndex > 0) setPageIndex(p.pageIndex);
  }, [stateAdapter, setFilter, setSearch, setPageIndex, setPageSize]);

  return null;
}

function ActivityTableToolbar({
  searchPlaceholder,
  timeRangePlaceholder,
  convertFromApiTimestamp,
  convertToApiTimestamp,
}: {
  searchPlaceholder?: string;
  timeRangePlaceholder?: string;
  convertFromApiTimestamp: (timestamp: string) => Date;
  convertToApiTimestamp: (date: Date) => number;
}) {
  const { t } = useLingui();
  const { filters, setFilter, clearAllFilters } = useDataTableFilters();

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
  const resourceLabels: Record<string, string> = {
    dnszones: t`DNS Zone`,
    dnsrecords: t`DNS Record`,
    dnsrecordsets: t`DNS Record Set`,
    httpproxies: t`AI Edge`,
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

  return (
    <>
      <DataTableToolbar
        search={
          <DatumDataTable.Search
            placeholder={searchPlaceholder || t`Search activity...`}
            className="w-full md:w-64"
          />
        }
        filters={
          <>
            <DateRangePicker
              presets={ACTIVITY_DATE_PRESETS}
              placeholder={timeRangePlaceholder || t`Filter by time range`}
              showClearButton={false}
              value={{
                from: filters.start ? convertFromApiTimestamp(String(filters.start)) : undefined,
                to: filters.end ? convertFromApiTimestamp(String(filters.end)) : undefined,
              }}
              onValueChange={(range) => {
                if (range) {
                  if (range.from) setFilter('start', String(convertToApiTimestamp(range.from)));
                  if (range.to) setFilter('end', String(convertToApiTimestamp(range.to)));
                } else {
                  clearAllFilters();
                }
              }}
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                theme="outline"
                size="small"
                htmlType="button"
                onClick={() =>
                  setFilter('actions', ['create', 'update', 'patch', 'delete', 'deletecollection'])
                }>
                <Trans>All write operations</Trans>
              </Button>
              <Button
                theme="outline"
                size="small"
                htmlType="button"
                onClick={() => setFilter('actions', ['get', 'list', 'watch'])}>
                <Trans>All read operations</Trans>
              </Button>
            </div>

            <DatumDataTable.CheckboxFilter
              column="actions"
              label={t`Actions`}
              options={[
                { value: 'get', label: t`Get` },
                { value: 'list', label: t`List` },
                { value: 'watch', label: t`Watch` },
                { value: 'create', label: t`Create` },
                { value: 'update', label: t`Update` },
                { value: 'patch', label: t`Patch` },
                { value: 'delete', label: t`Delete` },
              ]}
            />

            <DatumDataTable.CheckboxFilter
              column="responseCode"
              label={t`Response Code`}
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
            />

            <DatumDataTable.CheckboxFilter
              column="resourceType"
              label={t`Resource Type`}
              options={[
                { value: 'dnszones', label: t`DNS Zone` },
                { value: 'dnsrecords', label: t`DNS Record` },
                { value: 'dnsrecordsets', label: t`DNS Record Set` },
                { value: 'httpproxies', label: t`AI Edge` },
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
            />

            <DatumDataTable.CheckboxFilter
              column="apiGroup"
              label={t`API Group`}
              options={[
                { value: 'dns.miloapis.com', label: 'dns.miloapis.com' },
                { value: 'resourcemanager.miloapis.com', label: 'resourcemanager.miloapis.com' },
              ]}
            />
          </>
        }
      />

      <DatumDataTable.ActiveFilters
        label={t`Selected filters`}
        excludeFilters={['start', 'end', 'search']}
        filterLabels={{
          actions: t`Actions`,
          responseCode: t`Response Code`,
          resourceType: t`Resource Type`,
          apiGroup: t`API Group`,
        }}
        formatFilterValue={{
          actions: (item: string) => actionLabels[item] ?? item,
          responseCode: (item: string) => codeLabels[item] ?? item,
          resourceType: (item: string) => resourceLabels[item] ?? item,
          apiGroup: (item: string) => item,
        }}
      />
    </>
  );
}

export default function ActivityList({
  resourceType,
  resourceId,
  queryKeyPrefix: _queryKeyPrefix = ['activity'],
  searchPlaceholder,
  timeRangePlaceholder,
}: ActivityListProps) {
  const { settings, user } = useApp();

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

  const defaultFilters = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    return {
      start: String(convertToApiTimestamp(sevenDaysAgo)),
      end: String(convertToApiTimestamp(now)),
      actions: ['create', 'update', 'patch', 'delete', 'deletecollection'] as string[],
    };
  }, [convertToApiTimestamp]);

  const stateAdapter = useNuqsAdapter({
    filters: {
      start: parseAsString.withDefault(''),
      end: parseAsString.withDefault(''),
      actions: parseAsArrayOf(parseAsString).withDefault([]),
      responseCode: parseAsArrayOf(parseAsString).withDefault([]),
      resourceType: parseAsArrayOf(parseAsString).withDefault([]),
      apiGroup: parseAsArrayOf(parseAsString).withDefault([]),
    },
  });

  const columns = useMemo(() => createColumns(user || undefined), [user]);

  const fetchFn = useCallback(
    async (args: ServerFetchArgs) => {
      const filters: ActivityQueryParams = normalizeActivityFiltersForApi(args.filters);

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
        default:
          break;
      }

      return activityListQuery(resource.resourceType, resource.resourceId, {
        limit: args.limit,
        cursor: args.cursor,
        filters,
        search: args.search,
      });
    },
    [resourceType, resourceId]
  );

  const transform = useCallback((data: ActivityListResponse) => {
    const logs = data?.data?.logs || [];
    const token = data?.data?.nextPageToken;
    return {
      data: logs,
      cursor: token || undefined,
      hasNextPage: !!token,
    };
  }, []);

  return (
    <DatumDataTable.Server
      columns={columns}
      fetchFn={fetchFn}
      transform={transform}
      limit={20}
      getRowId={(row) => row.auditID}
      defaultFilters={defaultFilters}
      stateAdapter={stateAdapter}>
      <div className="m-4 flex flex-col gap-2">
        <ActivityNuqsHydration stateAdapter={stateAdapter} />
        <ActivityTableToolbar
          searchPlaceholder={searchPlaceholder}
          timeRangePlaceholder={timeRangePlaceholder}
          convertFromApiTimestamp={convertFromApiTimestamp}
          convertToApiTimestamp={convertToApiTimestamp}
        />
        <div className="overflow-hidden rounded-lg border">
          <DatumDataTable.Content emptyMessage="No activity found." />
        </div>
        <DatumDataTable.Pagination pageSizes={[10, 20, 50]} />
      </div>
    </DatumDataTable.Server>
  );
}
