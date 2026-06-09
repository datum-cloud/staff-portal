import { getServiceDetailMetadata, useServiceDetailData } from '../shared';
import type { Route } from './+types/approvals';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { MessageCard } from '@/components/message-card';
import { consumerMatchesService, useApprovalDialog } from '@/features/service-catalog';
import { useServiceConsumersInProjectQuery } from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import type { ComMiloapisServicesV1Alpha1ServiceConsumer } from '@openapi/services.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router';

type ServiceConsumer = ComMiloapisServicesV1Alpha1ServiceConsumer;

export const handle = {
  breadcrumb: () => <Trans>Approvals</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { displayName } = getServiceDetailMetadata(matches);
  return metaObject(`Approvals - ${displayName}`);
};

const columnHelper = createColumnHelper<ServiceConsumer>();

export default function ApprovalsPage() {
  const { t } = useLingui();
  const service = useServiceDetailData();
  const serviceName = service.metadata?.name ?? '';
  const producerProject = service.spec?.owner?.producerProjectRef?.name ?? '';
  const canonicalName = service.spec?.serviceName;

  const { data, isLoading, error, refetch } = useServiceConsumersInProjectQuery(producerProject);
  const { openDialog, dialog } = useApprovalDialog(producerProject);

  const items = (data?.items ?? []).filter(
    (c) =>
      consumerMatchesService(c, serviceName, canonicalName) &&
      c.status?.phase === 'PendingApproval' &&
      !c.spec?.approval
  );

  const actions: ActionItem<ServiceConsumer>[] = [
    {
      label: t`Approve`,
      icon: <CheckCircle className="size-4" />,
      onClick: (row) => openDialog(row.metadata?.name ?? '', 'Approved'),
    },
    {
      label: t`Deny`,
      icon: <XCircle className="size-4" />,
      variant: 'destructive' as const,
      onClick: (row) => openDialog(row.metadata?.name ?? '', 'Denied'),
    },
  ];

  const columns = [
    columnHelper.accessor((row) => row.spec?.consumerProjectRef?.name ?? '', {
      id: 'project',
      header: ({ column }) => (
        <DataTable.ColumnHeader column={column} title={t`Consumer Project`} />
      ),
      cell: ({ getValue }) => {
        const project = getValue();
        return project ? (
          <Link
            to={projectRoutes.detail(project)}
            className="text-primary font-mono text-sm hover:underline">
            {project}
          </Link>
        ) : (
          <Text size="sm" textColor="muted">
            —
          </Text>
        );
      },
    }),
    columnHelper.accessor((row) => row.metadata?.name ?? '', {
      id: 'name',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Consumer ID`} />,
      cell: ({ getValue }) => (
        <Text size="xs" textColor="muted" className="font-mono">
          {getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor((row) => row.metadata?.creationTimestamp ?? '', {
      id: 'requestedAt',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Requested at`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} variant="relative" addSuffix />,
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

  if (error) {
    const is403 =
      error instanceof Error &&
      (error.message.includes('403') || error.message.includes('Forbidden'));
    return (
      <MessageCard
        message={
          is403 ? (
            <Trans>Access denied — IAM role pending.</Trans>
          ) : (
            <Trans>Failed to load approvals.</Trans>
          )
        }
        detail={
          is403 ? (
            <Trans>
              The <code>services.miloapis.com-approver</code> role has not yet been provisioned for
              this staff token. Approval data is not visible until the role is deployed.
            </Trans>
          ) : error instanceof Error ? (
            error.message
          ) : (
            String(error)
          )
        }
        actions={
          !is403 && (
            <button onClick={() => refetch()} className="text-primary text-sm hover:underline">
              <Trans>Retry</Trans>
            </button>
          )
        }
      />
    );
  }

  return (
    <>
      {dialog}
      <DataTable.Client
        loading={isLoading}
        data={items}
        columns={columns}
        getRowId={(row) => row.metadata?.name ?? ''}
        defaultSort={[{ id: 'requestedAt', desc: false }]}
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return [row.spec?.consumerProjectRef?.name, row.metadata?.name]
            .map((s) => (s ?? '').toLowerCase())
            .some((s) => s.includes(q));
        }}>
        <Card className="m-4 py-4 shadow-none">
          <CardContent className="flex flex-col gap-2 px-4">
            <DataTableToolbar
              search={
                <DataTable.Search
                  placeholder={t`Search by project or ID...`}
                  className="w-full md:w-64"
                />
              }
            />
            <DataTable.Content
              headerClassName="bg-muted/50"
              className="border-t border-b border-solid"
              emptyMessage={t`No pending approval requests.`}
            />
            <DataTable.Pagination className="pb-0" />
          </CardContent>
        </Card>
      </DataTable.Client>
    </>
  );
}
