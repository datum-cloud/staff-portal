import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import BadgeState from '@/components/badge-state';
import ConfirmDialog from '@/components/confirm-dialog';
import Tooltip from '@/components/tooltip';
import { DataTable, DataTableProvider, useDataTableQuery } from '@/modules/data-table';
import { Button } from '@/modules/shadcn/ui/button';
import { toast } from '@/modules/toast';
import { orgDeleteMutation, orgQuery } from '@/resources/request/client/organization.request';
import { Organization, OrganizationListResponse } from '@/resources/schemas/organization.schema';
import { metaObject } from '@/utils/helpers';
import { Trans, useLingui } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject('Organizations');
};

const columnHelper = createColumnHelper<Organization>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ getValue }) => {
      return <Link to={`./${getValue()}`}>{getValue()}</Link>;
    },
  }),
  columnHelper.accessor('metadata.annotations', {
    header: () => <Trans>Description</Trans>,
    cell: ({ row }) => {
      return (
        row.original.metadata.annotations?.['kubernetes.io/display-name'] ||
        row.original.metadata.name
      );
    },
  }),
  columnHelper.accessor('spec.type', {
    header: () => <Trans>Type</Trans>,
    cell: ({ getValue }) => {
      return <BadgeState state={getValue() ?? 'Organization'} />;
    },
  }),
];

export default function Page() {
  const { t } = useLingui();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    orgs: Organization[];
    isBulkDelete: boolean;
  }>({
    open: false,
    orgs: [],
    isBulkDelete: false,
  });

  const tableState = useDataTableQuery<OrganizationListResponse>({
    queryKeyPrefix: 'orgs',
    fetchFn: orgQuery,
    useSorting: true,
    useGlobalFilter: true,
  });

  const handleDeleteOrg = async () => {
    if (!deleteDialog.orgs.length && !deleteDialog.isBulkDelete) return;

    try {
      await Promise.all(deleteDialog.orgs.map((org) => orgDeleteMutation(org.metadata.name)));
      await new Promise((resolve) => setTimeout(() => resolve(tableState.query.refetch()), 1000));
      tableState.setRowSelection({});

      toast.success(t`Organizations deleted successfully`);
    } catch (error) {
      toast.error(t`Failed to delete organization(s)`);
    }
  };

  const actions = [
    {
      label: t`Delete`,
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (org: Organization) => {
        setDeleteDialog({ open: true, orgs: [org], isBulkDelete: false });
      },
    },
  ];
  return (
    <>
      <DataTableProvider<Organization, OrganizationListResponse>
        {...tableState}
        columns={columns}
        selectable
        actions={actions}
        transform={(data) => ({
          rows: data?.data?.items || [],
          cursor: data?.data?.metadata?.continue,
        })}>
        {({ table }) => (
          <>
            <AppActionBar>
              <div className="flex items-center gap-2">
                {table.getFilteredSelectedRowModel().rows.length > 0 && (
                  <Tooltip message={<Trans>Delete Selected</Trans>}>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        setDeleteDialog({
                          open: true,
                          orgs: table.getFilteredSelectedRowModel().rows.map((row) => row.original),
                          isBulkDelete: true,
                        })
                      }>
                      <Trash2Icon />
                    </Button>
                  </Tooltip>
                )}
              </div>
            </AppActionBar>
            <div className="m-4 flex flex-col gap-2">
              <DataTable />
            </div>
          </>
        )}
      </DataTableProvider>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, orgs: [], isBulkDelete: false })}
        title={deleteDialog.isBulkDelete ? t`Delete Organizations` : t`Delete Organization`}
        description={
          deleteDialog.isBulkDelete
            ? t`Are you sure you want to delete ${Object.keys(tableState.rowSelection).length} selected organization(s)? This action cannot be undone.`
            : t`Are you sure you want to delete organization "${deleteDialog.orgs[0]?.metadata.name}"? This action cannot be undone.`
        }
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={handleDeleteOrg}
      />
    </>
  );
}
