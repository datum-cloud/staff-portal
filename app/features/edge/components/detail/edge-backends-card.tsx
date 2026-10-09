import { BadgeState } from '@/components/badge';
import { ButtonCopy } from '@/components/button';
import { SimpleTable } from '@/components/simple-table';
import type { HttpProxy, HttpProxyBackendRow, HttpProxyBackendRule } from '@/features/edge/lib';
import { SectionCard } from '@/features/milo';
import { createColumnHelper } from '@/utils/table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';

/** Bar and dot colours, in backend order. Repeats past five. */
const BACKEND_COLORS = [
  'var(--primary)',
  'var(--color-chart-2)',
  'var(--color-chart-4)',
  'var(--color-chart-3)',
  'var(--color-chart-5)',
] as const;

function backendColor(index: number): string {
  return BACKEND_COLORS[index % BACKEND_COLORS.length];
}

type Row = HttpProxyBackendRow & { index: number };

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor('target', {
    header: () => <Trans>Backend</Trans>,
    cell: ({ row }) => {
      const backend = row.original;
      return (
        <div className="flex min-w-0 items-start gap-2">
          <span
            className={cn('mt-1.5 size-2 shrink-0 rounded-full', backend.drained && 'opacity-30')}
            style={{ backgroundColor: backendColor(backend.index) }}
          />
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-1">
              <Text className="text-sm font-medium break-all">{backend.target}</Text>
              {backend.kind === 'endpoint' && <ButtonCopy value={backend.target} />}
            </div>
            {backend.details.length > 0 && (
              <Text size="xs" textColor="muted">
                {backend.details.join(' · ')}
              </Text>
            )}
          </div>
        </div>
      );
    },
  }),
  columnHelper.accessor('kindLabel', {
    header: () => <Trans>Type</Trans>,
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        <BadgeState noColor state="kind" message={row.original.kindLabel} />
        {row.original.hasFilters && <BadgeState noColor state="filters" message="Filters" />}
      </div>
    ),
  }),
  columnHelper.accessor('weight', {
    header: () => <Trans>Weight</Trans>,
    cell: ({ getValue }) => <Text className="text-sm tabular-nums">{getValue()}</Text>,
  }),
  columnHelper.accessor('shareLabel', {
    header: () => <Trans>Traffic</Trans>,
    cell: ({ row }) =>
      row.original.drained ? (
        <BadgeState state="warning" message="Drained" />
      ) : (
        <Text className="text-sm tabular-nums">{row.original.shareLabel}</Text>
      ),
  }),
];

function DistributionBar({ backends }: { backends: HttpProxyBackendRow[] }) {
  if (backends.length < 2 || backends.every((b) => b.share === 0)) return null;
  return (
    <div className="bg-muted flex h-2 w-full overflow-hidden rounded-full">
      {backends.map((backend, index) =>
        backend.share > 0 ? (
          <div
            key={index}
            style={{ width: `${backend.share}%`, backgroundColor: backendColor(index) }}
          />
        ) : null
      )}
    </div>
  );
}

function RulePool({ rule, showHeading }: { rule: HttpProxyBackendRule; showHeading: boolean }) {
  const rows = rule.backends.map((backend, index) => ({ ...backend, index }));
  return (
    <div className="flex flex-col gap-2">
      {showHeading && (
        <Text size="xs" weight="medium" textColor="muted" className="font-mono">
          {rule.name ? `${rule.name} · ${rule.matchLabel}` : rule.matchLabel}
        </Text>
      )}
      <DistributionBar backends={rule.backends} />
      <SimpleTable columns={columns} data={rows} getRowId={(row) => String(row.index)} />
    </div>
  );
}

export function EdgeBackendsCard({ proxy }: { proxy: HttpProxy }) {
  const rules = proxy.backendRules ?? [];
  const showHeadings = rules.length > 1 || rules.some((rule) => rule.matchLabel !== '/');

  return (
    <SectionCard
      title={<Trans>Backends</Trans>}
      description={
        rules.length > 1 ? (
          <Trans>Each routing rule has its own pool, weighted within the rule.</Trans>
        ) : undefined
      }
      contentClassName="flex flex-col gap-4">
      {rules.length > 0 ? (
        rules.map((rule, index) => <RulePool key={index} rule={rule} showHeading={showHeadings} />)
      ) : (
        <Text textColor="muted" className="text-sm">
          <Trans>No backends configured</Trans>
        </Text>
      )}
    </SectionCard>
  );
}
