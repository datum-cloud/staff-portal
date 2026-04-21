import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import {
  useDeleteFraudProviderMutation,
  useFraudProviderListQuery,
} from '@/resources/request/client';
import { fraudRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisFraudV1Alpha1FraudProvider } from '@openapi/fraud.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { EditIcon, PlusCircleIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

type FraudProvider = ComMiloapisFraudV1Alpha1FraudProvider;

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Fraud Providers`);
};

const columnHelper = createColumnHelper<FraudProvider>();

export default function Page() {
  const navigate = useNavigate();
  const tableQuery = useFraudProviderListQuery();
  const [selectedProvider, setSelectedProvider] = useState<FraudProvider | null>(null);
  const deleteProviderMutation = useDeleteFraudProviderMutation();

  const actions: ActionItem<FraudProvider>[] = [
    {
      label: t`Edit`,
      icon: EditIcon,
      onClick: (row) => navigate(fraudRoutes.providers.detail(row.metadata?.name ?? '')),
    },
    {
      label: t`Delete`,
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedProvider(row),
    },
  ];

  const columns = [
    columnHelper.accessor('metadata.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ getValue }) => (
        <Link
          to={fraudRoutes.providers.detail(getValue() ?? '')}
          className="font-medium text-blue-600 hover:underline">
          {getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor('spec.type', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Type`} />,
      cell: ({ getValue }) => <BadgeState state="info" message={getValue() ?? 'unknown'} />,
    }),
    columnHelper.accessor('spec.failurePolicy', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Failure Policy`} />,
      cell: ({ getValue }) => {
        const policy = getValue() ?? 'FailOpen';
        return <BadgeState state={policy === 'FailClosed' ? 'warning' : 'info'} message={policy} />;
      },
    }),
    columnHelper.accessor('spec.config.endpoint', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Endpoint`} />,
      cell: ({ getValue }) => (
        <Text size="sm" textColor="muted" className="max-w-xs truncate">
          {getValue() ?? 'default'}
        </Text>
      ),
    }),
    columnHelper.display({
      id: 'status',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Status`} />,
      cell: ({ row }) => {
        const conditions = row.original.status?.conditions ?? [];
        const available = conditions.find((c) => c.type === 'Available');
        if (!available) return <BadgeState state="unknown" />;
        return (
          <BadgeState
            state={available.status === 'True' ? 'active' : 'error'}
            message={
              available.status === 'True' ? 'Available' : (available.reason ?? 'Unavailable')
            }
          />
        );
      },
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <div className="text-right" />,
      cell: ({ row }) => (
        <div className="flex w-full justify-end">
          <DataTable.RowActions row={row} actions={actions} />
        </div>
      ),
    }),
  ];

  return (
    <>
      <AppActionBar>
        <Button
          type="primary"
          icon={<PlusCircleIcon size={16} />}
          onClick={() => navigate(fraudRoutes.providers.create())}>
          <Trans>Add Provider</Trans>
        </Button>
      </AppActionBar>

      <DialogConfirm
        open={!!selectedProvider}
        onOpenChange={() => setSelectedProvider(null)}
        title={t`Delete Provider`}
        description={t`Are you sure you want to delete provider "${selectedProvider?.metadata?.name ?? ''}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={async () => {
          await deleteProviderMutation.mutateAsync(selectedProvider?.metadata?.name ?? '');
          setSelectedProvider(null);
          toast.success(t`Provider deleted successfully`);
        }}
      />

      <DataTable.Client
        loading={tableQuery.isLoading}
        data={tableQuery.data?.items ?? []}
        columns={columns}
        pageSize={20}
        getRowId={(row) => row.metadata?.name ?? ''}
        defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}>
        <Card className="m-4 py-4 shadow-none">
          <CardContent className="flex flex-col gap-2 px-4">
            <DataTable.Content
              headerClassName="bg-muted/50"
              className="border-t border-b border-solid"
              emptyMessage={t`No fraud providers configured.`}
            />
            <DataTable.Pagination className="pb-0" />
          </CardContent>
        </Card>
      </DataTable.Client>
    </>
  );
}
