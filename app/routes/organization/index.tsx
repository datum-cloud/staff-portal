import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { orgListQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import {
  ClientDataTable,
  ClientDataTableProvider,
  ClientDataTableSearch,
  ClientDataTableFacetFilter,
  createAdvancedSearch,
  useClientDataTableQuery,
} from '@datum-ui/client-data-table';
import { DataTableActiveFilters } from '@datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  ComMiloapisResourcemanagerV1Alpha1Organization,
  ComMiloapisResourcemanagerV1Alpha1OrganizationList,
} from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Organizations`);
};

const columnHelper = createColumnHelper<ComMiloapisResourcemanagerV1Alpha1Organization>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const orgName = row.original.metadata?.name ?? '';
      const displayName = row.original.metadata?.annotations?.['kubernetes.io/display-name'] ?? '';

      return (
        <DisplayName displayName={displayName || orgName} name={orgName} to={`./${orgName}`} />
      );
    },
  }),
  columnHelper.accessor('spec.type', {
    header: () => <Trans>Type</Trans>,
    cell: ({ getValue }) => {
      return <BadgeState state={getValue() ?? 'Organization'} />;
    },
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    id: 'metadata.creationTimestamp',
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => <DateTime date={getValue()} />,
  }),
];

export default function Page() {
  const tableState = useClientDataTableQuery<ComMiloapisResourcemanagerV1Alpha1OrganizationList>({
    queryKeyPrefix: 'orgs',
    fetchFn: orgListQuery,
    defaultSort: ['metadata.creationTimestamp:desc'],
    useSorting: true,
    useSearch: true,
    useFilters: true,
  });

  return (
    <ClientDataTableProvider<
      ComMiloapisResourcemanagerV1Alpha1Organization,
      ComMiloapisResourcemanagerV1Alpha1OrganizationList
    >
      {...tableState}
      columns={columns}
      transform={(data) => data?.items || []}
      filterFn={(row, filters) => {
        if (filters.type && row.spec?.type !== filters.type) {
          return false;
        }
        return true;
      }}
      globalFilterFn={createAdvancedSearch<ComMiloapisResourcemanagerV1Alpha1Organization>([
        (row) => row.metadata?.name?.toLowerCase() || '',
        (row) => row.metadata?.annotations?.['kubernetes.io/display-name']?.toLowerCase() || '',
        (row) => row.spec?.type?.toLowerCase() || '',
      ])}>
      <div className="m-4 flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <ClientDataTableSearch placeholder={t`Search organizations...`} />
          <ClientDataTableFacetFilter
            filterKey="type"
            label={t`Organization Type`}
            placeholder={t`Filter by type`}
            options={[
              { value: 'Personal', label: t`Personal` },
              { value: 'Standard', label: t`Standard` },
            ]}
          />
        </div>
        <DataTableActiveFilters
          filters={tableState.filters}
          search={tableState.search}
          onClearFilter={tableState.clearFilter}
          onClearAllFilters={tableState.clearAllFilters}
          onClearSearch={tableState.clearSearch}
          filterLabels={{
            type: t`Organization Type`,
          }}
          formatFilterValue={(key, value) => {
            if (key === 'type') {
              const labels: Record<string, string> = {
                Personal: t`Personal`,
                Standard: t`Standard`,
              };
              return labels[value] || value;
            }
            return String(value);
          }}
          excludeFilters={['search']}
        />
        <ClientDataTable<ComMiloapisResourcemanagerV1Alpha1Organization> />
      </div>
    </ClientDataTableProvider>
  );
}
