import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../shared';
import type { Route } from './+types/index';
import { DateFormatter } from '@/components/date';
import { DisplayName } from '@/components/display';
import { orgProjectListQuery } from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import {
  ClientDataTable,
  ClientDataTableProvider,
  ClientDataTableSearch,
  createAdvancedSearch,
  useClientDataTableQuery,
} from '@datum-ui/client-data-table';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  ComMiloapisResourcemanagerV1Alpha1Project,
  ComMiloapisResourcemanagerV1Alpha1ProjectList,
} from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';

export const handle = {
  breadcrumb: () => <Trans>Projects</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Projects - ${organizationName}`);
};

const columnHelper = createColumnHelper<ComMiloapisResourcemanagerV1Alpha1Project>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const projectName = row.original.metadata?.name ?? '';
      const description = row.original.metadata?.annotations?.['kubernetes.io/description'] ?? '';

      return (
        <DisplayName
          displayName={description || projectName}
          name={projectName}
          to={projectRoutes.detail(projectName)}
        />
      );
    },
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => {
      return <DateFormatter date={getValue()} withTime />;
    },
  }),
];

export default function Page() {
  const data = useOrganizationDetailData();

  const tableState = useClientDataTableQuery<ComMiloapisResourcemanagerV1Alpha1ProjectList>({
    queryKeyPrefix: ['organizations', data.metadata?.name ?? '', 'projects'],
    fetchFn: () => orgProjectListQuery(data.metadata?.name ?? ''),
    useSorting: true,
    useSearch: true,
  });

  return (
    <ClientDataTableProvider<
      ComMiloapisResourcemanagerV1Alpha1Project,
      ComMiloapisResourcemanagerV1Alpha1ProjectList
    >
      columns={columns}
      transform={(data) => data?.items || []}
      globalFilterFn={createAdvancedSearch<ComMiloapisResourcemanagerV1Alpha1Project>([
        (row) => row.metadata?.name?.toLowerCase() || '',
        (row) => row.metadata?.annotations?.['kubernetes.io/description']?.toLowerCase() || '',
      ])}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <ClientDataTableSearch placeholder={t`Search projects...`} />
        <ClientDataTable />
      </div>
    </ClientDataTableProvider>
  );
}
