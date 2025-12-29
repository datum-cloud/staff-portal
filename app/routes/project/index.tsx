import type { Route } from './+types/index';
import { DateFormatter } from '@/components/date';
import { DisplayName } from '@/components/display';
import { projectListQuery } from '@/resources/request/client';
import { orgRoutes } from '@/utils/config/routes.config';
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
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Projects`);
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
          to={`./${projectName}`}
        />
      );
    },
  }),
  columnHelper.accessor('spec.ownerRef.name', {
    header: () => <Trans>Organization</Trans>,
    cell: ({ getValue }) => {
      return <Link to={orgRoutes.detail(getValue())}>{getValue()}</Link>;
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
  const tableState = useClientDataTableQuery<ComMiloapisResourcemanagerV1Alpha1ProjectList>({
    queryKeyPrefix: 'projects',
    fetchFn: projectListQuery,
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
        (row) => row.spec?.ownerRef?.name?.toLowerCase() || '',
      ])}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <ClientDataTableSearch placeholder={t`Search projects...`} />
        </div>
        <ClientDataTable<ComMiloapisResourcemanagerV1Alpha1Project> />
      </div>
    </ClientDataTableProvider>
  );
}
