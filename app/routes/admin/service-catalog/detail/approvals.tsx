import { getServiceDetailMetadata, useServiceDetailData } from '../shared';
import type { Route } from './+types/approvals';
import { DateTime } from '@/components/date';
import { MessageCard } from '@/components/message-card';
import { ListColumnHeader, ListTable } from '@/features/milo';
import { useApprovalDialog } from '@/features/service-catalog';
import type { EnrichedServiceConsumer } from '@/modules/graphql/service-consumers';
import { useServiceConsumersEnrichedQuery } from '@/resources/request/client';
import { STATUS_ICONS } from '@/utils/config/icons.config';
import { orgRoutes, projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@/utils/table';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from 'react-router';

type ServiceConsumer = EnrichedServiceConsumer;

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

  // The consumer's serviceRef may hold either the Service's metadata.name or
  // its canonical spec.serviceName, so ask the gateway for both.
  const serviceNames = [...new Set([serviceName, canonicalName].filter((n): n is string => !!n))];
  const { data, isLoading, error, refetch } = useServiceConsumersEnrichedQuery(
    producerProject,
    serviceNames
  );
  const { openDialog, dialog } = useApprovalDialog(producerProject);

  const items = (data ?? []).filter((c) => c.phase === 'PendingApproval' && !c.approvalDecision);

  const actions: ActionItem<ServiceConsumer>[] = [
    {
      label: t`Approve`,
      icon: <STATUS_ICONS.success className="size-4" />,
      onClick: (row) => openDialog(row.name, 'Approved'),
    },
    {
      label: t`Deny`,
      icon: <STATUS_ICONS.error className="size-4" />,
      variant: 'destructive' as const,
      onClick: (row) => openDialog(row.name, 'Denied'),
    },
  ];

  const columns = [
    columnHelper.accessor((row) => row.consumerProject.organizationDisplayName, {
      id: 'organization',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Organization`} />,
      cell: ({ row }) => {
        const { organizationName, organizationDisplayName } = row.original.consumerProject;
        if (!organizationName) {
          return (
            <Text size="sm" textColor="muted">
              —
            </Text>
          );
        }
        return (
          <Link
            to={orgRoutes.detail(organizationName)}
            className="text-primary text-sm hover:underline">
            {organizationDisplayName}
          </Link>
        );
      },
    }),
    columnHelper.accessor((row) => row.consumerProject.displayName, {
      id: 'project',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Consumer Project`} />,
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
          <Link to={projectRoutes.detail(name)} className="text-primary text-sm hover:underline">
            {displayName}
          </Link>
        );
      },
    }),
    columnHelper.accessor((row) => row.requestedAt ?? '', {
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
        getRowId={(row) => row.name}
        defaultSort={[{ id: 'requestedAt', desc: false }]}
        searchPlaceholder={t`Search by project, organization, or ID...`}
        emptyMessage={t`No pending approval requests.`}
        inset="tab"
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return [
            row.consumerProject.name,
            row.consumerProject.displayName,
            row.consumerProject.organizationName,
            row.consumerProject.organizationDisplayName,
            row.name,
          ]
            .map((s) => (s ?? '').toLowerCase())
            .some((s) => s.includes(q));
        }}
      />
    </>
  );
}
