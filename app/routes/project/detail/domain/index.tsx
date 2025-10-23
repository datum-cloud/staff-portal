import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/index';
import { DateFormatter } from '@/components/date';
import { DomainDnsProviders, DomainExpiration, DomainStatusProbe } from '@/features/domain';
import { projectDomainListQuery } from '@/resources/request/client';
import { Domain, DomainListResponse } from '@/resources/schemas';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { DataTable, DataTableProvider, useDataTableQuery } from '@datum-ui/data-table';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Domain - ${projectName}`);
};

const columnHelper = createColumnHelper<Domain>();

export default function Page() {
  const { project } = useProjectDetailData();

  const tableState = useDataTableQuery<DomainListResponse>({
    queryKeyPrefix: ['projects', project.metadata.name, 'domains'],
    fetchFn: (params) => projectDomainListQuery(project.metadata.name, params),
    useSorting: true,
  });

  const columns = [
    columnHelper.accessor('metadata.name', {
      header: () => <Trans>Name</Trans>,
      cell: ({ getValue }) => (
        <Link to={projectRoutes.domain.detail(project.metadata.name, getValue())}>
          {getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor('spec.domainName', {
      header: () => <Trans>Domain</Trans>,
      cell: ({ getValue }) => getValue(),
    }),
    columnHelper.accessor('status.registration.registrar.name', {
      header: () => <Trans>Registrar</Trans>,
      cell: ({ getValue }) => getValue(),
    }),
    columnHelper.accessor('status.nameservers', {
      header: () => <Trans>DNS Providers</Trans>,
      cell: ({ getValue }) => <DomainDnsProviders nameservers={getValue()} maxVisible={2} />,
    }),
    columnHelper.accessor('status.registration.expiresAt', {
      header: () => <Trans>Expiration Date</Trans>,
      cell: ({ getValue }) => <DomainExpiration expiresAt={getValue()} />,
    }),
    columnHelper.accessor('status', {
      header: () => <Trans>Status</Trans>,
      cell: ({ row }) => (
        <DomainStatusProbe
          projectName={project.metadata.name}
          domainName={row.original.metadata.name}
        />
      ),
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      header: () => <Trans>Created</Trans>,
      cell: ({ getValue }) => <DateFormatter date={getValue()} withTime />,
    }),
  ];

  return (
    <DataTableProvider<Domain, DomainListResponse>
      columns={columns}
      transform={(data) => ({
        rows: data?.data?.items || [],
        cursor: data?.data?.metadata?.continue,
      })}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <DataTable<Domain> />
      </div>
    </DataTableProvider>
  );
}
