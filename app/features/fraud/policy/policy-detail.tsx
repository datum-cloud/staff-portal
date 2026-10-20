import type { FraudPolicy, Stage } from './types';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DescriptionList, type DescriptionListItem } from '@/components/description-list';
import { SectionCard } from '@/features/milo';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { fraudRoutes } from '@/utils/config/routes.config';
import { startCase } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { Eye, Layers, Shield, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** Map of FraudProvider name → availability (true/false, or undefined when unknown). */
type ProviderAvailability = Map<string, boolean | undefined>;

type Threshold = Stage['thresholds'][number];
type PolicyCondition = NonNullable<NonNullable<FraudPolicy['status']>['conditions']>[number];

/** A muted em dash for an empty field — the house convention over the word "None". */
function EmptyValue() {
  return (
    <Text as="span" size="sm" textColor="muted">
      —
    </Text>
  );
}

/**
 * Status conditions as colour-coded badges. A `Degraded` condition (a referenced
 * provider is unavailable) is amber when present; a healthy `Available` is green;
 * a failed `Available` is red. The condition message is surfaced on hover.
 */
function ConditionBadges({ conditions }: { conditions: PolicyCondition[] }) {
  const stateFor = (c: PolicyCondition): string => {
    const isDegraded = c.type.toLowerCase().includes('degraded');
    if (c.status === 'Unknown') return 'pending';
    if (c.status === 'False') return isDegraded ? 'success' : 'error';
    // status === 'True'
    return isDegraded ? 'warning' : 'success';
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {conditions.map((c, i) => (
        <BadgeState
          key={`${c.type}-${i}`}
          state={stateFor(c)}
          message={startCase(c.type)}
          tooltip={c.message || undefined}
        />
      ))}
    </div>
  );
}

/** Enforcement mode as an icon + badge: OBSERVE logs only, AUTO applies actions. */
function EnforcementBadge({ mode }: { mode: FraudPolicy['spec']['enforcement']['mode'] }) {
  return (
    <div className="flex items-center gap-2">
      {mode === 'OBSERVE' ? (
        <Eye className="text-muted-foreground size-4" />
      ) : (
        <Zap className="size-4 text-yellow-500" />
      )}
      <BadgeState
        state={mode === 'OBSERVE' ? 'info' : 'warning'}
        message={startCase(mode)}
        tooltip={
          mode === 'OBSERVE'
            ? t`Thresholds are evaluated but no enforcement action is applied — results are logged only.`
            : t`Threshold actions (Review / Deactivate) are applied automatically.`
        }
      />
    </div>
  );
}

/**
 * A provider reference as a chip: a live availability dot (green = Available,
 * red = unavailable, grey = unknown), the provider name, linked to its detail
 * page. Surfaces the provider→policy-health relation inline (an unavailable
 * provider is what degrades the policy).
 */
function ProviderChip({
  name,
  availability,
}: {
  name: string;
  availability: ProviderAvailability;
}) {
  const known = availability.has(name);
  const available = availability.get(name);
  const dot = !known ? 'bg-muted-foreground/40' : available ? 'bg-green-500' : 'bg-red-500';
  const title = !known
    ? t`Provider status unknown`
    : available
      ? t`Provider available`
      : t`Provider unavailable — this degrades the policy`;

  return (
    <Link
      to={fraudRoutes.providers.detail(name)}
      className="bg-muted hover:bg-accent inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors">
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', dot)} title={title} />
      <Text as="span" size="xs" weight="medium">
        {name}
      </Text>
    </Link>
  );
}

/** A band of the 0–100 score range mapped to a decision, derived from the thresholds. */
type DecisionBand = { label: string; from: number; to: number; bar: string; dot: string };

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

/**
 * Turns a stage's thresholds into ordered decision bands over the 0–100 score
 * range: everything below the lowest threshold is Accept (green); each threshold
 * opens a band for its action (Review = amber, Deactivate = red) up to the next
 * threshold or 100.
 */
function toDecisionBands(thresholds: Threshold[]): DecisionBand[] {
  const sorted = [...thresholds].sort((a, b) => a.minScore - b.minScore);
  if (!sorted.length) return [];

  const bands: DecisionBand[] = [
    { label: t`Accept`, from: 0, to: sorted[0].minScore, bar: 'bg-green-500', dot: 'bg-green-500' },
  ];
  sorted.forEach((th, i) => {
    const to = i < sorted.length - 1 ? sorted[i + 1].minScore : 100;
    const isDeactivate = th.action === 'DEACTIVATE';
    bands.push({
      label: startCase(th.action),
      from: th.minScore,
      to,
      bar: isDeactivate ? 'bg-red-500' : 'bg-yellow-500',
      dot: isDeactivate ? 'bg-red-500' : 'bg-yellow-500',
    });
  });
  return bands;
}

/**
 * The stage's score thresholds as a 0–100 decision-band bar plus a legend, so
 * the mapping from score to Accept / Review / Deactivate reads at a glance —
 * the same decisions surfaced on the evaluation detail page.
 */
function ThresholdScale({ thresholds }: { thresholds: Threshold[] }) {
  const bands = toDecisionBands(thresholds);

  if (!bands.length) {
    return (
      <Text size="xs" textColor="muted">
        <Trans>No thresholds — this stage scores without mapping to an action.</Trans>
      </Text>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        {bands.map((b) => (
          <div
            key={b.label}
            className={b.bar}
            style={{ width: `${clampPct(b.to - b.from)}%` }}
            title={`${b.label}: ${b.from}–${b.to === 100 ? 100 : b.to}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {bands.map((b) => (
          <span key={b.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn('size-1.5 rounded-full', b.dot)} />
            <Text as="span" size="xs" weight="medium">
              {b.label}
            </Text>
            <Text as="span" size="xs" textColor="muted" className="font-mono">
              {b.from}–{b.to === 100 ? '100' : b.to}
            </Text>
          </span>
        ))}
      </div>
    </div>
  );
}

/** A labelled field within a stage block (Providers / Thresholds). */
function StageField({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Text size="xs" textColor="muted" className="font-medium tracking-wide uppercase">
        {label}
      </Text>
      {children}
    </div>
  );
}

/**
 * One stage in the pipeline card: an eyebrow (`Stage N`) + the stage name, any
 * Required / Short-circuit markers, then its providers and its score→decision
 * bands stacked below. A plain block rather than its own card, so stages don't
 * read as cards nested in a card (matches the evaluation detail's stage results).
 */
function StageBlock({
  stage,
  index,
  isLast,
  availability,
}: {
  stage: Stage;
  index: number;
  isLast: boolean;
  availability: ProviderAvailability;
}) {
  return (
    <div className={cn('space-y-3', !isLast && 'border-border border-b pb-5')}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <Text size="xs" textColor="muted" className="font-medium tracking-wide uppercase">
            {t`Stage ${index + 1}`}
          </Text>
          <Text size="sm" weight="medium">
            {startCase(stage.name)}
          </Text>
        </div>
        <div className="flex items-center gap-2">
          {stage.required && (
            <BadgeState
              state="info"
              message={t`Required`}
              tooltip={t`Always runs, even when an earlier stage short-circuits the pipeline.`}
            />
          )}
          {stage.shortCircuit && (
            <BadgeState
              state="pending"
              message={t`Short-circuit < ${stage.shortCircuit.skipWhenBelow}`}
              tooltip={t`If this stage's top score is below ${stage.shortCircuit.skipWhenBelow}, later non-required stages are skipped.`}
            />
          )}
        </div>
      </div>

      <StageField label={<Trans>Providers</Trans>}>
        {stage.providers.length ? (
          <div className="flex flex-wrap gap-1.5">
            {stage.providers.map((p) => (
              <ProviderChip
                key={p.providerRef.name}
                name={p.providerRef.name}
                availability={availability}
              />
            ))}
          </div>
        ) : (
          <EmptyValue />
        )}
      </StageField>

      <StageField label={<Trans>Score thresholds</Trans>}>
        <ThresholdScale thresholds={stage.thresholds} />
      </StageField>
    </div>
  );
}

/**
 * Detail-page header for the fraud policy: icon + policy name + a one-line
 * summary (mode · stages), with the Edit / Delete actions pulled to the right.
 * Matches the `EntityHeader` house pattern the evaluation detail uses.
 */
function PolicyHeader({
  policy,
  onEdit,
  onDelete,
}: {
  policy: FraudPolicy;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const stageCount = policy.spec.stages.length;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md">
          <Shield className="size-5" />
        </div>
        <div className="flex min-w-0 flex-col">
          <Title level={5} className="truncate font-mono">
            {policy.metadata?.name}
          </Title>
          <Text
            size="sm"
            textColor="muted"
            className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>{startCase(policy.spec.enforcement.mode)}</span>
            <span aria-hidden>·</span>
            <span>{t`${stageCount} ${stageCount === 1 ? 'stage' : 'stages'}`}</span>
          </Text>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="tertiary"
          theme="outline"
          icon={<ACTION_ICONS.edit size={16} />}
          onClick={onEdit}>
          <Trans>Edit</Trans>
        </Button>
        <Button
          type="danger"
          theme="outline"
          icon={<ACTION_ICONS.delete size={16} />}
          onClick={onDelete}>
          <Trans>Delete</Trans>
        </Button>
      </div>
    </div>
  );
}

function PolicyOverview({ policy }: { policy: FraudPolicy }) {
  const { spec, status, metadata } = policy;
  const conditions = status?.conditions ?? [];
  const triggers = spec.triggers ?? [];

  const items: DescriptionListItem[] = [
    {
      label: <Trans>Enforcement</Trans>,
      value: <EnforcementBadge mode={spec.enforcement.mode} />,
    },
    {
      label: <Trans>Triggers</Trans>,
      value: triggers.length ? (
        <div className="flex flex-wrap gap-1.5">
          {triggers.map((trigger, i) => (
            <BadgeState
              key={i}
              state="info"
              message={trigger.type === 'Event' ? (trigger.event ?? trigger.type) : trigger.type}
            />
          ))}
        </div>
      ) : (
        <EmptyValue />
      ),
    },
    {
      label: <Trans>Status</Trans>,
      hidden: conditions.length === 0,
      value: <ConditionBadges conditions={conditions} />,
    },
    {
      label: <Trans>History retention</Trans>,
      value: (
        <Text size="sm">{t`${spec.historyRetention?.maxEntries ?? 50} entries per evaluation`}</Text>
      ),
    },
    {
      label: <Trans>Created</Trans>,
      hidden: !metadata?.creationTimestamp,
      value: <DateTime date={metadata?.creationTimestamp} variant="both" />,
    },
  ];

  return (
    <SectionCard title={<Trans>Policy Overview</Trans>}>
      <DescriptionList items={items} labelWidth="22%" />
    </SectionCard>
  );
}

function PolicyPipeline({
  stages,
  availability,
}: {
  stages: Stage[];
  availability: ProviderAvailability;
}) {
  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Layers className="size-4" />
          <Trans>Evaluation Pipeline</Trans>
        </span>
      }
      description={
        <Trans>Stages run top to bottom; an earlier stage can short-circuit the rest.</Trans>
      }>
      {stages.length ? (
        <div className="space-y-5">
          {stages.map((stage, i) => (
            <StageBlock
              key={stage.name}
              stage={stage}
              index={i}
              isLast={i === stages.length - 1}
              availability={availability}
            />
          ))}
        </div>
      ) : (
        <Text size="sm" textColor="muted">
          <Trans>No stages configured.</Trans>
        </Text>
      )}
    </SectionCard>
  );
}

export function PolicyDetail({
  policy,
  providerAvailability,
  onEdit,
  onDelete,
}: {
  policy: FraudPolicy;
  providerAvailability: ProviderAvailability;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-4 p-4">
      <PolicyHeader policy={policy} onEdit={onEdit} onDelete={onDelete} />
      <PolicyOverview policy={policy} />
      <PolicyPipeline stages={policy.spec.stages} availability={providerAvailability} />
    </div>
  );
}

/**
 * Loading placeholder that mirrors the policy detail layout — header (icon +
 * name + actions), the overview card, and the pipeline card — so the page keeps
 * its shape while data loads instead of a lone spinner.
 */
export function PolicyDetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>

      <SectionCard title={<Trans>Policy Overview</Trans>}>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={<Trans>Evaluation Pipeline</Trans>}>
        <div className="space-y-5">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
