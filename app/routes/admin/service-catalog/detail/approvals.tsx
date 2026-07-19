import { getServiceDetailMetadata, useServiceDetailData } from '../shared';
import type { Route } from './+types/approvals';
import { DateTime } from '@/components/date';
import { MessageCard } from '@/components/message-card';
import { ListColumnHeader, ListTable } from '@/features/milo';
import { consumerMatchesService, useApprovalDialog } from '@/features/service-catalog';
import { useServiceConsumersInProjectQuery } from '@/resources/request/client';
import { STATUS_ICONS } from '@/utils/config/icons.config';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import type { ComMiloapisServicesV1Alpha1ServiceConsumer } from '@openapi/services.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
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
      icon: <STATUS_ICONS.success className="size-4" />,
      onClick: (row) => openDialog(row.metadata?.name ?? '', 'Approved'),
    },
    {
      label: t`Deny`,
      icon: <STATUS_ICONS.error className="size-4" />,
      variant: 'destructive' as const,
      onClick: (row) => openDialog(row.metadata?.name ?? '', 'Denied'),
    },
  ];

  const columns = [
    columnHelper.accessor((row) => row.spec?.consumerProjectRef?.name ?? '', {
      id: 'project',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Consumer Project`} />,
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
      header: ({ column }) => <ListColumnHeader column={column} title={t`Consumer ID`} />,
      cell: ({ getValue }) => (
        <Text size="xs" textColor="muted" className="font-mono">
          {getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor((row) => row.metadata?.creationTimestamp ?? '', {
      id: 'requestedAt',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Requested at`} />,
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
      <ListTable
        loading={isLoading}
        data={items}
        columns={columns}
        getRowId={(row) => row.metadata?.name ?? ''}
        defaultSort={[{ id: 'requestedAt', desc: false }]}
        searchPlaceholder={t`Search by project or ID...`}
        emptyMessage={t`No pending approval requests.`}
        inset="tab"
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return [row.spec?.consumerProjectRef?.name, row.metadata?.name]
            .map((s) => (s ?? '').toLowerCase())
            .some((s) => s.includes(q));
        }}
      />
    </>
  );
}
