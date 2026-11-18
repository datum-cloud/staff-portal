import {
  getDnsZoneReadiness,
  toNameserverFqdn,
  type DnsZoneCondition,
  type DnsZoneReadiness,
  type DnsZoneStatus,
} from '../lib/dns-zone-status';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { SimpleTable } from '@/components/simple-table';
import { SectionCard } from '@/features/milo';
import { createColumnHelper } from '@/utils/table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';

/** BadgeState colour key for each readiness: green, grey and red. */
const BADGE_STATE: Record<DnsZoneReadiness, string> = {
  ready: 'active',
  pending: 'pending',
  failed: 'failed',
};

interface DnsZoneStatusBadgeProps {
  status: DnsZoneStatus | undefined | null;
}

/**
 * Readiness of a DNS zone from its `status.conditions`. The tooltip carries the
 * message of the condition holding the zone back. Renders a dash when the zone
 * has no status at all (search-index rows).
 */
export function DnsZoneStatusBadge({ status }: DnsZoneStatusBadgeProps) {
  const { t } = useLingui();
  const info = getDnsZoneReadiness(status);
  if (!info) return <Text textColor="muted">—</Text>;

  const labels: Record<DnsZoneReadiness, string> = {
    ready: t`Ready`,
    pending: t`Pending`,
    failed: t`Failed`,
  };

  return (
    <BadgeState
      state={BADGE_STATE[info.readiness]}
      message={labels[info.readiness]}
      tooltip={info.message ?? info.reason}
    />
  );
}

const conditionColumnHelper = createColumnHelper<DnsZoneCondition>();

const conditionColumns = [
  conditionColumnHelper.accessor('type', {
    header: () => <Trans>Type</Trans>,
    cell: (info) => (
      <Text size="xs" className="font-mono">
        {info.getValue()}
      </Text>
    ),
  }),
  conditionColumnHelper.accessor('status', {
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
  conditionColumnHelper.accessor('reason', {
    header: () => <Trans>Reason</Trans>,
    cell: (info) => (
      <Text size="xs" className="font-mono">
        {info.getValue()}
      </Text>
    ),
  }),
  conditionColumnHelper.accessor('message', {
    header: () => <Trans>Message</Trans>,
    cell: (info) => <span className="text-wrap break-words">{info.getValue()}</span>,
  }),
  conditionColumnHelper.accessor('lastTransitionTime', {
    header: () => <Trans>Updated</Trans>,
    cell: (info) => (
      <Text size="xs" textColor="muted">
        <DateTime date={info.getValue()} variant="relative" addSuffix />
      </Text>
    ),
  }),
];

interface DnsZoneStatusCardProps {
  status: DnsZoneStatus | undefined | null;
  className?: string;
}

/**
 * Zone readiness for the DNS zone detail page: the summary badge, every
 * condition the controller reports, and the nameservers Datum assigned to the
 * zone (`status.nameservers`), which the customer must delegate to. These are
 * not the registrar-side nameservers shown in the Nameservers table.
 */
export function DnsZoneStatusCard({ status, className }: DnsZoneStatusCardProps) {
  const conditions = status?.conditions ?? [];
  const nameservers = (status?.nameservers ?? []).filter((ns) => ns.trim()).map(toNameserverFqdn);

  return (
    <SectionCard
      className={className}
      title={
        <span className="flex items-center gap-2">
          <Trans>Zone status</Trans>
          <DnsZoneStatusBadge status={status ?? {}} />
        </span>
      }>
      <div className="flex flex-col gap-4">
        {conditions.length === 0 ? (
          <Text size="sm" textColor="muted" className="italic">
            <Trans>No conditions reported yet.</Trans>
          </Text>
        ) : (
          <SimpleTable<DnsZoneCondition>
            columns={conditionColumns}
            data={conditions}
            getRowId={(row) => row.type}
          />
        )}

        <div className="flex flex-col gap-2">
          <Text size="sm" weight="medium">
            <Trans>Assigned nameservers</Trans>
          </Text>
          <Text size="xs" textColor="muted">
            <Trans>
              The nameservers Datum serves this zone from. The domain must be delegated to them at
              its registrar.
            </Trans>
          </Text>
          {nameservers.length === 0 ? (
            <Text size="sm" textColor="muted" className="italic">
              <Trans>No nameservers assigned yet.</Trans>
            </Text>
          ) : (
            <ul className="flex flex-col gap-1" data-testid="dns-zone-assigned-nameservers">
              {nameservers.map((ns) => (
                <li key={ns}>
                  <code className="font-mono text-xs break-all">{ns}</code>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
