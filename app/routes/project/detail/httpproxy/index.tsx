import type { Route } from './+types/index';
import BadgeCondition from '@/components/badge-condition';
import DateFormatter from '@/components/date-formatter';
import { DataTable, DataTableProvider, useDataTableQuery } from '@/modules/data-table';
import { projectHttpProxyListQuery } from '@/resources/request/client/project.request';
import { HTTPProxy, HTTPProxyListResponse } from '@/resources/schemas/httpproxy.schema';
import { Project } from '@/resources/schemas/project.schema';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Link, useRouteLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<Project>(matches, 'routes/project/detail/layout');
  return metaObject(`HTTPProxy - ${data?.metadata?.name}`);
};

const columnHelper = createColumnHelper<HTTPProxy>();

export default function Page() {
  const data = useRouteLoaderData('routes/project/detail/layout') as Project;

  const tableState = useDataTableQuery<HTTPProxyListResponse>({
    queryKeyPrefix: ['http-proxy', data.metadata.name],
    fetchFn: (params) => projectHttpProxyListQuery(data.metadata.name, params),
    useSorting: true,
  });

  const columns = [
    columnHelper.accessor('metadata.name', {
      header: () => <Trans>Name</Trans>,
      cell: ({ getValue }) => (
        <Link to={`/projects/${data.metadata.name}/http-proxies/${getValue()}`}>{getValue()}</Link>
      ),
    }),
    columnHelper.accessor('spec.rules', {
      header: () => <Trans>Endpoint</Trans>,
      cell: ({ getValue }) => (
        <div className="flex flex-col gap-2">
          {getValue().map((rule, index) => (
            <div key={index}>{rule.backends.map((backend) => backend.endpoint).join(', ')}</div>
          ))}
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      header: () => <Trans>Status</Trans>,
      cell: ({ getValue }) => (
        <BadgeCondition status={getValue()} multiple={false} showMessage className="text-xs" />
      ),
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      header: () => <Trans>Created at</Trans>,
      cell: ({ getValue }) => <DateFormatter date={getValue()} withTime />,
    }),
  ];

  return (
    <DataTableProvider<HTTPProxy, HTTPProxyListResponse>
      columns={columns}
      transform={(data) => ({
        rows: data?.data?.items || [],
        cursor: data?.data?.metadata?.continue,
      })}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <DataTable<HTTPProxy> />
      </div>
    </DataTableProvider>
  );
}
