import type { Route } from './+types/approvals';
import { useApprovalDialog } from './use-approval-dialog';
import { DateTime } from '@/components/date';
import {
  useServiceConsumersInProjectQuery,
  useServiceDetailQuery,
} from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisServicesV1Alpha1ServiceConsumer } from '@openapi/services.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { useParams } from 'react-router';

type ServiceConsumer = ComMiloapisServicesV1Alpha1ServiceConsumer;

export const meta: Route.MetaFunction = ({ params }) => {
  return metaObject(t`Approvals — ${params.name ?? ''}`);
};

export default function ApprovalsPage() {
  const { name } = useParams<{ name: string }>();
  const serviceName = name ?? '';

  const { data: service } = useServiceDetailQuery(serviceName);
  const producerProject = service?.spec?.owner?.producerProjectRef?.name ?? '';
  const canonicalName = service?.spec?.serviceName;

  const { data, isLoading, error, refetch } = useServiceConsumersInProjectQuery(producerProject);
  const { openDialog, dialog } = useApprovalDialog(producerProject);

  const items = (data?.items ?? []).filter((c) => {
    const ref = c.spec?.serviceRef?.name;
    const matchesService = ref === serviceName || (canonicalName && ref === canonicalName);
    return matchesService && c.status?.phase === 'PendingApproval' && !c.spec?.approval;
  });

  const columnHelper = createColumnHelper<ServiceConsumer>();

  const columns = [
    columnHelper.accessor((row) => row.spec?.consumerProjectRef?.name ?? '', {
      id: 'project',
      header: ({ column }) => (
        <DataTable.ColumnHeader column={column} title={t`Consumer Project`} />
      ),
      cell: ({ getValue }) => {
        const project = getValue();
        if (!project)
          return (
            <Text size="sm" textColor="muted">
              -
            </Text>
          );
        return (
          <Text size="sm" className="font-mono">
            {project}
          </Text>
        );
      },
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
        <div className="flex w-full justify-end gap-2">
          <Button
            size="small"
            type="primary"
            icon={<CheckCircle size={14} />}
            onClick={() => openDialog(row.original, 'Approved')}>
            <Trans>Approve</Trans>
          </Button>
          <Button
            size="small"
            type="danger"
            icon={<XCircle size={14} />}
            onClick={() => openDialog(row.original, 'Denied')}>
            <Trans>Deny</Trans>
          </Button>
        </div>
      ),
    }),
  ];

  if (error) {
    const is403 =
      error instanceof Error &&
      (error.message.includes('403') || error.message.includes('Forbidden'));
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          {is403 ? (
            <>
              <Text size="sm" textColor="muted">
                <Trans>Access denied — IAM role pending.</Trans>
              </Text>
              <Text size="sm" textColor="muted" className="text-xs">
                <Trans>
                  The <code>services.miloapis.com-approver</code> role has not yet been provisioned
                  for this staff token. Approval data is not visible until the role is deployed.
                </Trans>
              </Text>
            </>
          ) : (
            <>
              <Text size="sm" textColor="muted">
                <Trans>Failed to load approvals.</Trans>
              </Text>
              <Text size="sm" textColor="muted" className="font-mono text-xs">
                {error instanceof Error ? error.message : String(error)}
              </Text>
              <button onClick={() => refetch()} className="text-primary text-sm hover:underline">
                <Trans>Retry</Trans>
              </button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {dialog}
      <DataTable.Client
        loading={isLoading}
        data={items}
        columns={columns}
        pageSize={25}
        getRowId={(row) => row.metadata?.name ?? ''}
        defaultSort={[{ id: 'requestedAt', desc: false }]}>
        <Card className="m-4 py-4 shadow-none">
          <CardContent className="flex flex-col gap-2 px-4">
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
