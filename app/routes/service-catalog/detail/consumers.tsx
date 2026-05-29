import type { Route } from './+types/consumers';
import { humanizePhase } from './phase';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { useApprovalDialog } from '@/features/service-catalog';
import {
  useRevokeServiceEntitlementMutation,
  useServiceConsumersInProjectQuery,
  useServiceDetailQuery,
} from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisServicesV1Alpha1ServiceConsumer } from '@openapi/services.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { CheckCircle, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';

type ServiceConsumer = ComMiloapisServicesV1Alpha1ServiceConsumer;

export const meta: Route.MetaFunction = ({ params }) => {
  return metaObject(t`Consumers — ${params.name ?? ''}`);
};

const columnHelper = createColumnHelper<ServiceConsumer>();

export default function ConsumersPage() {
  const { name } = useParams<{ name: string }>();
  const serviceName = name ?? '';
  const { data: service } = useServiceDetailQuery(serviceName);
  const producerProject = service?.spec?.owner?.producerProjectRef?.name;
  const canonicalName = service?.spec?.serviceName;

  const { openDialog, dialog } = useApprovalDialog(producerProject ?? '');
  const revokeMutation = useRevokeServiceEntitlementMutation(producerProject ?? '');
  const [revokeTarget, setRevokeTarget] = useState<ServiceConsumer | null>(null);

  const { data, isLoading, error, refetch } = useServiceConsumersInProjectQuery(producerProject);

  const columns = [
    columnHelper.accessor((row) => row.spec?.consumerProjectRef?.name ?? '', {
      id: 'project',
      header: ({ column }) => (
        <DataTable.ColumnHeader column={column} title={t`Consumer Project`} />
      ),
      cell: ({ getValue }) => {
        const project = getValue();
        return project ? (
          <Text size="sm" className="font-mono">
            {project}
          </Text>
        ) : (
          <Text size="sm" textColor="muted">
            —
          </Text>
        );
      },
    }),
    columnHelper.accessor((row) => row.status?.phase ?? '', {
      id: 'phase',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Phase`} />,
      cell: ({ getValue }) => {
        const phase = getValue();
        return phase ? (
          <BadgeState state={phase} message={humanizePhase(phase)} />
        ) : (
          <BadgeState state="pending" message={t`Unknown`} />
        );
      },
    }),
    columnHelper.accessor((row) => row.spec?.approval?.decision ?? '', {
      id: 'approval',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Approval`} />,
      cell: ({ getValue, row }) => {
        const decision = getValue();
        const message = row.original.spec?.approval?.message;
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
    columnHelper.accessor((row) => row.metadata?.creationTimestamp ?? '', {
      id: 'createdAt',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Requested at`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} variant="relative" addSuffix />,
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
    columnHelper.display({
      id: 'actions',
      header: () => <div className="text-right" />,
      cell: ({ row }) => {
        const phase = row.original.status?.phase;
        const hasApprovalDecision = !!row.original.spec?.approval;
        if (phase === 'PendingApproval' && !hasApprovalDecision) {
          return (
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
          );
        }
        if (phase === 'Active') {
          return (
            <div className="flex w-full justify-end">
              <Button
                size="small"
                type="danger"
                theme="outline"
                icon={<Trash2 size={14} />}
                onClick={() => setRevokeTarget(row.original)}>
                <Trans>Revoke</Trans>
              </Button>
            </div>
          );
        }
        return <div />;
      },
    }),
  ];

  // The controller writes spec.serviceRef.name as either the Service's
  // metadata.name or its canonical spec.serviceName depending on age/version,
  // so match against both.
  const items = (data?.items ?? []).filter((c) => {
    const ref = c.spec?.serviceRef?.name;
    return ref === serviceName || (canonicalName && ref === canonicalName);
  });

  if (!service) {
    // Service detail is still loading or errored; layout handles those states.
    return null;
  }

  if (!producerProject) {
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Text size="sm" textColor="muted">
            <Trans>
              This service has no producer project recorded, so consumers cannot be listed.
            </Trans>
          </Text>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const is403 =
      error instanceof Error &&
      (error.message.includes('403') || error.message.includes('Forbidden'));
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Text size="sm" textColor="muted">
            {is403 ? (
              <Trans>You do not have permission to view consumers in the producer project.</Trans>
            ) : (
              <Trans>Failed to load consumers.</Trans>
            )}
          </Text>
          {!is403 && (
            <Text size="sm" textColor="muted" className="font-mono text-xs">
              {error instanceof Error ? error.message : String(error)}
            </Text>
          )}
          {!is403 && (
            <button onClick={() => refetch()} className="text-primary text-sm hover:underline">
              <Trans>Retry</Trans>
            </button>
          )}
        </CardContent>
      </Card>
    );
  }

  const revokeConsumerProject = revokeTarget?.spec?.consumerProjectRef?.name ?? '';
  // The ServiceEntitlement in the consumer project is conventionally named
  // after the Service's metadata.name; the consumer's spec.serviceRef.name
  // may be either form, so prefer this page's URL param.
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
        pageSize={25}
        getRowId={(row) => row.metadata?.name ?? ''}
        defaultSort={[{ id: 'createdAt', desc: true }]}>
        <Card className="m-4 py-4 shadow-none">
          <CardContent className="flex flex-col gap-2 px-4">
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
