import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { VendorFormDialog } from '@/features/compliance';
import {
  useDeleteVendorMutation,
  useVendorListQuery,
  type Vendor,
} from '@/resources/request/client';
import { complianceRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { EditIcon, PlusCircleIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Vendors`);
};

const columnHelper = createColumnHelper<Vendor>();

const RISK_TIER_BADGE: Record<string, 'info' | 'warning' | 'error' | 'active'> = {
  Low: 'info',
  Medium: 'active',
  High: 'warning',
  Critical: 'error',
};

export default function Page() {
  const tableQuery = useVendorListQuery();
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const deleteVendorMutation = useDeleteVendorMutation();

  const actions: ActionItem<Vendor>[] = [
    {
      label: t`Edit`,
      icon: <EditIcon className="size-4" />,
      onClick: (row) => setEditingVendor(row),
    },
    {
      label: t`Delete`,
      icon: <Trash2Icon className="size-4" />,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedVendor(row),
    },
  ];

  const columns = [
    columnHelper.accessor('metadata.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => {
        const name = row.original.metadata?.name ?? '';
        return (
          <Link to={complianceRoutes.vendors.detail(name)} className="font-medium">
            {name}
          </Link>
        );
      },
    }),
    columnHelper.accessor('spec.displayName', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Display Name`} />,
      cell: ({ getValue }) => <Text size="sm">{getValue() ?? '-'}</Text>,
    }),
    columnHelper.accessor('spec.legalEntity', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Legal Entity`} />,
      cell: ({ getValue }) => (
        <Text size="sm" textColor="muted">
          {getValue() ?? '-'}
        </Text>
      ),
    }),
    columnHelper.accessor('spec.countryOfIncorporation', {
      id: 'country',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Country`} />,
      cell: ({ getValue }) => <Text size="sm">{getValue() ?? '-'}</Text>,
    }),
    columnHelper.accessor('spec.complianceProfile.phase', {
      id: 'phase',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Phase`} />,
      cell: ({ getValue }) => {
        const phase = getValue();
        if (!phase)
          return (
            <Text size="sm" textColor="muted">
              <Trans>No profile</Trans>
            </Text>
          );
        return <BadgeState state={phase === 'Active' ? 'active' : 'info'} message={phase} />;
      },
    }),
    columnHelper.accessor('spec.complianceProfile.riskTier', {
      id: 'riskTier',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Risk Tier`} />,
      cell: ({ getValue }) => {
        const tier = getValue();
        if (!tier)
          return (
            <Text size="sm" textColor="muted">
              -
            </Text>
          );
        return <BadgeState state={RISK_TIER_BADGE[tier] ?? 'info'} message={tier} />;
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
          onClick={() => setShowCreate(true)}>
          <Trans>Add Vendor</Trans>
        </Button>
      </AppActionBar>

      <VendorFormDialog open={showCreate} onOpenChange={setShowCreate} />

      <VendorFormDialog
        key={editingVendor?.metadata?.name ?? 'edit'}
        open={!!editingVendor}
        onOpenChange={(open) => {
          if (!open) setEditingVendor(null);
        }}
        vendor={editingVendor ?? undefined}
      />

      <DialogConfirm
        open={!!selectedVendor}
        onOpenChange={() => setSelectedVendor(null)}
        title={t`Delete Vendor`}
        description={t`Are you sure you want to delete vendor "${selectedVendor?.metadata?.name ?? ''}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={async () => {
          await deleteVendorMutation.mutateAsync(selectedVendor?.metadata?.name ?? '');
          setSelectedVendor(null);
          toast.success(t`Vendor deleted successfully`);
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
              emptyMessage={t`No vendors registered.`}
            />
            <DataTable.Pagination className="pb-0" />
          </CardContent>
        </Card>
      </DataTable.Client>
    </>
  );
}
