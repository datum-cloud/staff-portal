import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { SimpleTable } from '@/components/simple-table';
import { SectionCard } from '@/features/milo';
import { createColumnHelper } from '@/utils/table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisServicesV1Alpha1ServiceConfiguration } from '@openapi/services.miloapis.com/v1alpha1';
import { ListChecks } from 'lucide-react';

type Condition = NonNullable<
  NonNullable<ComMiloapisServicesV1Alpha1ServiceConfiguration['status']>['conditions']
>[number];

const columnHelper = createColumnHelper<Condition>();

const columns = [
  columnHelper.accessor('type', {
    header: () => <Trans>Type</Trans>,
    cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
  }),
  columnHelper.accessor('status', {
    header: () => <Trans>Status</Trans>,
    cell: (info) => {
      const status = info.getValue();
      return (
        <BadgeState
          state={status === 'True' ? 'active' : status === 'False' ? 'error' : 'pending'}
          message={status}
        />
      );
    },
  }),
  columnHelper.accessor('reason', {
    header: () => <Trans>Reason</Trans>,
    cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
  }),
  columnHelper.accessor('message', {
    header: () => <Trans>Message</Trans>,
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('lastTransitionTime', {
    header: () => <Trans>Updated</Trans>,
    cell: (info) => (
      <span className="text-muted-foreground text-xs">
        <DateTime date={info.getValue()} variant="relative" addSuffix />
      </span>
    ),
  }),
];

interface Props {
  conditions: Condition[];
  hasActiveConfiguration: boolean;
  isLoading?: boolean;
}

export function ConditionsCard({ conditions, hasActiveConfiguration, isLoading }: Props) {
  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <ListChecks className="h-4 w-4" />
          <Trans>Conditions</Trans>
        </span>
      }>
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="bg-muted h-4 w-32 animate-pulse rounded" />
              <div className="bg-muted h-4 w-16 animate-pulse rounded" />
              <div className="bg-muted h-4 flex-1 animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : conditions.length === 0 ? (
        <Text size="sm" textColor="muted" className="italic">
          {hasActiveConfiguration ? (
            <Trans>No conditions reported.</Trans>
          ) : (
            <Trans>No active configuration.</Trans>
          )}
        </Text>
      ) : (
        <SimpleTable<Condition> columns={columns} data={conditions} getRowId={(row) => row.type} />
      )}
    </SectionCard>
  );
}
