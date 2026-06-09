import { getServiceDetailMetadata, useServiceDetailData } from '../shared';
import type { Route } from './+types/consumers';
import { BadgeState } from '@/components/badge';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { MessageCard } from '@/components/message-card';
import { useApprovalDialog } from '@/features/service-catalog';
import type { EnrichedServiceConsumer } from '@/modules/graphql/service-consumers';
import {
  useRevokeServiceEntitlementMutation,
  useServiceConsumersEnrichedQuery,
} from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { CheckCircle, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

type ServiceConsumer = EnrichedServiceConsumer;

export const handle = {
  breadcrumb: () => <Trans>Consumers</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { displayName } = getServiceDetailMetadata(matches);
  return metaObject(`Consumers - ${displayName}`);
};

const columnHelper = createColumnHelper<ServiceConsumer>();

export default function ConsumersPage() {
  const { t } = useLingui();
  const service = useServiceDetailData();
  const serviceName = service.metadata?.name ?? '';
  const producerProject = service.spec?.owner?.producerProjectRef?.name;
  const canonicalName = service.spec?.serviceName;

  const { openDialog, dialog } = useApprovalDialog(producerProject ?? '');
  const revokeMutation = useRevokeServiceEntitlementMutation(producerProject ?? '');
  const [revokeTarget, setRevokeTarget] = useState<ServiceConsumer | null>(null);

  const { data, isLoading, error } = useServiceConsumersEnrichedQuery(producerProject);

  const actions: ActionItem<ServiceConsumer>[] = [
    {
      label: t`Approve`,
      icon: <CheckCircle className="size-4" />,
      hidden: (row) => !(row.phase === 'PendingApproval' && !row.approvalDecision),
      onClick: (row) => openDialog(row.name, 'Approved'),
    },
    {
      label: t`Deny`,
      icon: <XCircle className="size-4" />,
      variant: 'destructive' as const,
      hidden: (row) => !(row.phase === 'PendingApproval' && !row.approvalDecision),
      onClick: (row) => openDialog(row.name, 'Denied'),
    },
    {
      label: t`Revoke`,
      icon: <Trash2 className="size-4" />,
      variant: 'destructive' as const,
      hidden: (row) => row.phase !== 'Active',
      onClick: (row) => setRevokeTarget(row),
    },
  ];

  const columns = [
    columnHelper.accessor((row) => row.consumerProject.displayName, {
      id: 'project',
      header: ({ column }) => (
        <DataTable.ColumnHeader column={column} title={t`Consumer Project`} />
      ),
      cell: ({ row }) => {
        const { name, displayName } = row.original.consumerProject;
        if (!name) {
          return (
            <Text size="sm" textColor="muted">
              —
            </Text>
          );
        }
        return (
          <div className="flex flex-col">
            <Link to={projectRoutes.detail(name)} className="text-primary text-sm hover:underline">
              {displayName}
            </Link>
            {displayName !== name && (
              <Text size="xs" textColor="muted" className="font-mono">
                {name}
              </Text>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor((row) => row.phase ?? '', {
      id: 'phase',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Phase`} />,
      cell: ({ getValue }) => {
        const phase = getValue();
        return phase ? (
          <BadgeState state={phase} />
        ) : (
          <BadgeState state="pending" message={t`Unknown`} />
        );
      },
    }),
    columnHelper.accessor((row) => row.approvalDecision ?? '', {
      id: 'approval',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Approval`} />,
      cell: ({ getValue, row }) => {
        const decision = getValue();
        const message = row.original.approvalMessage;
        if (!decision) {
          return (
            <Text size="sm" textColor="muted">
              —
            </Text>
          );
        }
        return (
          <div className="inline-flex flex-col items-start gap-0.5">
            <BadgeState state={decision === 'Approved' ? 'active' : 'error'} message={decision} />
            {message && (
              <Text size="xs" textColor="muted" className="max-w-xs truncate" title={message}>
                {message}
              </Text>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor((row) => row.requestedAt ?? '', {
      id: 'createdAt',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Requested at`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} variant="relative" addSuffix />,
    }),
    columnHelper.accessor((row) => row.name, {
      id: 'name',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Consumer ID`} />,
      cell: ({ getValue }) => (
        <Text size="xs" textColor="muted" className="font-mono">
          {getValue()}
        </Text>
      ),
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

  const items = (data ?? []).filter(
    (c) => c.serviceName === serviceName || (!!canonicalName && c.serviceName === canonicalName)
  );

  if (!producerProject) {
    return (
      <MessageCard
        message={
          <Trans>
            This service has no producer project recorded, so consumers cannot be listed.
          </Trans>
        }
      />
    );
  }

  if (error) {
    return (
      <MessageCard
        message={<Trans>Failed to load consumers.</Trans>}
        detail={error instanceof Error ? error.message : String(error)}
      />
    );
  }

  const revokeConsumerProject = revokeTarget?.consumerProject.name ?? '';
  // The ServiceEntitlement in the consumer project is conventionally named
  // after the Service's metadata.name; the consumer's serviceName may be
  // either form, so prefer this page's URL param.
  const revokeEntitlementName = serviceName;

  return (
    <>
      {dialog}
      <DialogConfirm
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title={t`Revoke access`}
        description={t`Remove ${revokeConsumerProject}'s access to ${revokeEntitlementName}? They'll lose access immediately and all of their resources for this service will be permanently deleted. This cannot be undone.`}
        confirmText={t`Revoke`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={async () => {
          if (!revokeTarget) return;
          await revokeMutation.mutateAsync({
            consumerProject: revokeConsumerProject,
            entitlementName: revokeEntitlementName,
          });
          toast.success(t`Access revoked`);
          setRevokeTarget(null);
        }}
      />
      <DataTable.Client
        loading={isLoading}
        data={items}
        columns={columns}
        getRowId={(row) => row.name}
        defaultSort={[{ id: 'createdAt', desc: true }]}
        filterFns={{
          phase: (cellValue, filterValue) =>
            String(cellValue ?? '').toLowerCase() === String(filterValue ?? '').toLowerCase(),
        }}
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return [
            row.consumerProject.name,
            row.consumerProject.displayName,
            row.name,
            row.approvalMessage,
          ]
            .map((s) => (s ?? '').toLowerCase())
            .some((s) => s.includes(q));
        }}>
        <Card className="m-4 py-4 shadow-none">
          <CardContent className="flex flex-col gap-2 px-4">
            <DataTableToolbar
              search={
                <DataTable.Search
                  placeholder={t`Search by project, ID, or note...`}
                  className="w-full md:w-64"
                />
              }
              filters={
                <DataTable.SelectFilter
                  column="phase"
                  label={t`Phase`}
                  placeholder={t`Filter by phase`}
                  options={[
                    { value: 'PendingApproval', label: t`Pending Approval` },
                    { value: 'Active', label: t`Active` },
                    { value: 'Declined', label: t`Declined` },
                    { value: 'Inactive', label: t`Inactive` },
                  ]}
                />
              }
            />
            <DataTable.ActiveFilters
              excludeFilters={['search']}
              filterLabels={{ phase: t`Phase` }}
            />
            <DataTable.Content
              headerClassName="bg-muted/50"
              className="border-t border-b border-solid"
              emptyMessage={t`No consumers found.`}
            />
            <DataTable.Pagination className="pb-0" />
          </CardContent>
        </Card>
      </DataTable.Client>
    </>
  );
}
