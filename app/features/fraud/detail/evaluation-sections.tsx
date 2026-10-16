import { FraudDecisionBadge, FraudScore } from '../fraud-badges';
import type {
  FraudEvaluation,
  FraudEvaluationStatus,
  HistoryEntry,
  ProviderResult,
  StageResult,
} from './types';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DescriptionList, type DescriptionListItem } from '@/components/description-list';
import { DisplayId } from '@/components/display';
import {
  EMBEDDED_TABLE_BODY_CLASS,
  EMBEDDED_TABLE_CELL_CLASS,
  EMBEDDED_TABLE_HEADER_CELL_CLASS,
  LIST_TABLE_HEADER_CLASS,
  LIST_TABLE_HEADER_ROW_CLASS,
  LIST_TABLE_ROW_CLASS,
  ListColumnHeader,
  SectionCard,
  TableCard,
} from '@/features/milo';
import { useEnv } from '@/hooks/use-env';
import { ACTION_ICONS, ENTITY_ICONS } from '@/utils/config/icons.config';
import { fraudRoutes, userRoutes } from '@/utils/config/routes.config';
import { startCase } from '@/utils/helpers';
import { createColumnHelper, type ColumnDef } from '@/utils/table';
import { Button } from '@datum-cloud/datum-ui/button';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ArrowLeft, Clock, FileText, Mail, User } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link } from 'react-router';

function RawResponseDialog({
  open,
  onOpenChange,
  provider,
  raw,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: string;
  raw: string;
}) {
  let formatted = raw;
  try {
    formatted = JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    // leave as-is if not valid JSON
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="sm:max-w-2xl">
        <Dialog.Header
          title={t`Raw Results — ${provider}`}
          description={t`Full response from the provider`}
        />
        <Dialog.Body className="px-5">
          <pre className="bg-muted overflow-auto rounded-md p-4 text-xs">{formatted}</pre>
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="tertiary" theme="borderless" onClick={() => onOpenChange(false)}>
            <Trans>Close</Trans>
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

type RiskScoreReason = { multiplier: number; reasons: { code: string; reason: string }[] };

function parseRiskScoreReasons(raw: string): RiskScoreReason[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.risk_score_reasons) ? parsed.risk_score_reasons : [];
  } catch {
    return [];
  }
}

// MaxMind minFraud responses include an `id` UUID identifying the transaction.
// We deep-link into the MaxMind portal using that id when MAXMIND_ACCOUNT_ID is
// configured.
function parseMaxmindTransactionID(raw: string): string | undefined {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.id === 'string' ? parsed.id : undefined;
  } catch {
    return undefined;
  }
}

function parseScore(score: string | number | undefined): number {
  const n = typeof score === 'string' ? parseFloat(score) : score;
  return n == null || Number.isNaN(n) ? NaN : n;
}

/** Colours a provider risk score text: ≥75 red, ≥25 amber, else green (0–100 scale). */
function providerScoreColor(score: string | number | undefined): string {
  const n = parseScore(score);
  if (Number.isNaN(n)) return 'text-muted-foreground';
  if (n >= 75) return 'text-red-600 dark:text-red-400';
  if (n >= 25) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

/** Fill colour for the score meter bar, same thresholds as the text colour. */
function providerScoreBar(score: string | number | undefined): string {
  const n = parseScore(score);
  if (Number.isNaN(n)) return 'bg-muted-foreground/40';
  if (n >= 75) return 'bg-red-500';
  if (n >= 25) return 'bg-yellow-500';
  return 'bg-green-500';
}

/**
 * A provider's risk score as a compact meter: a 0–100 track with a coloured
 * fill plus the number. The bar makes the scale and severity legible without a
 * written legend. A `Composite` tag marks the score that became the
 * evaluation's composite (the highest across all stages).
 */
function ProviderScore({
  score,
  isComposite,
}: {
  score: string | number | undefined;
  isComposite?: boolean;
}) {
  const n = parseScore(score);
  const pct = Number.isNaN(n) ? 0 : Math.max(0, Math.min(100, n));

  return (
    <div className="flex items-center gap-2">
      {isComposite && (
        <BadgeState
          state="info"
          message={t`Composite`}
          tooltip={t`Highest score across all stages — this became the composite score.`}
        />
      )}
      <div className="flex items-center gap-2" title={t`Risk score: 0 = low risk, 100 = high risk`}>
        <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
          <div
            className={cn('h-full rounded-full', providerScoreBar(score))}
            style={{ width: `${pct}%` }}
          />
        </div>
        <Text
          as="span"
          className={cn(
            'w-6 text-right font-mono text-sm font-semibold',
            providerScoreColor(score)
          )}>
          {score}
        </Text>
      </div>
    </div>
  );
}

function ProviderResultRow({
  result,
  compositeScore,
}: {
  result: ProviderResult;
  compositeScore?: string;
}) {
  const [rawOpen, setRawOpen] = useState(false);
  const env = useEnv();

  const compositeNum = parseScore(compositeScore);
  const isComposite = !Number.isNaN(compositeNum) && parseScore(result.score) === compositeNum;

  const isMaxmind = result.provider === 'maxmind' && !!result.rawResponse;
  const riskReasons = isMaxmind ? parseRiskScoreReasons(result.rawResponse!) : [];
  const maxmindTxID = isMaxmind ? parseMaxmindTransactionID(result.rawResponse!) : undefined;
  const maxmindURL =
    maxmindTxID && env?.MAXMIND_ACCOUNT_ID
      ? `https://www.maxmind.com/en/accounts/${env.MAXMIND_ACCOUNT_ID}/minfraud-interactive/transactions/${maxmindTxID}`
      : undefined;

  return (
    <>
      {result.rawResponse && (
        <RawResponseDialog
          open={rawOpen}
          onOpenChange={setRawOpen}
          provider={result.provider}
          raw={result.rawResponse}
        />
      )}
      <div className="border-border border-b py-2 last:border-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Text size="sm" weight="medium">
              {startCase(result.provider)}
            </Text>
            {result.failurePolicyApplied && (
              <BadgeState state="warning" message={result.failurePolicyApplied} />
            )}
            {result.error && <BadgeState state="error" message={t`Error`} tooltip={result.error} />}
          </div>
          <div className="flex items-center gap-4">
            {result.duration && (
              <Text size="xs" textColor="muted" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {result.duration}
              </Text>
            )}
            <ProviderScore score={result.score} isComposite={isComposite} />
            {maxmindURL && (
              <Button
                size="xs"
                theme="outline"
                onClick={() => window.open(maxmindURL, '_blank', 'noopener,noreferrer')}>
                <ACTION_ICONS.externalLink className="mr-1 h-3 w-3" />
                <Trans>View on MaxMind</Trans>
              </Button>
            )}
            {result.rawResponse && (
              <Button size="xs" theme="outline" onClick={() => setRawOpen(true)}>
                <Trans>View Raw Results</Trans>
              </Button>
            )}
          </div>
        </div>
        {riskReasons.length > 0 && (
          <ul className="mt-2 space-y-1 pl-1">
            {riskReasons.map((r, i) =>
              r.reasons.map((reason, j) => (
                <li
                  key={`${i}-${j}`}
                  className="text-muted-foreground flex items-baseline gap-2 text-xs">
                  <span className="text-foreground w-10 shrink-0 text-right font-mono font-medium">
                    {r.multiplier}x
                  </span>
                  <span className="flex-1">{reason.reason}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </>
  );
}

/**
 * One stage within the "Stage Results" card: an eyebrow (`Stage N`) + the stage
 * name, an optional "Skipped" badge, then its provider rows. A plain block
 * rather than its own card, so stages don't read as cards nested in a card.
 */
function StageResultBlock({
  result,
  index,
  isLast,
  compositeScore,
}: {
  result: StageResult;
  index: number;
  isLast: boolean;
  compositeScore?: string;
}) {
  return (
    <div className={cn(!isLast && 'border-border border-b pb-4')}>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <Text size="xs" textColor="muted" className="font-medium tracking-wide uppercase">
            {t`Stage ${index + 1}`}
          </Text>
          <Text size="sm" weight="medium">
            {startCase(result.name)}
          </Text>
        </div>
        {result.skipped && <BadgeState state="pending" message={t`Skipped`} />}
      </div>
      {result.skipped ? (
        <Text size="xs" textColor="muted" className="mt-1">
          <Trans>An earlier stage already settled the decision, so this stage didn’t run.</Trans>
        </Text>
      ) : result.providerResults?.length ? (
        result.providerResults.map((pr, i) => (
          <ProviderResultRow key={i} result={pr} compositeScore={compositeScore} />
        ))
      ) : (
        <Text size="xs" textColor="muted" className="mt-1">
          <Trans>No provider results.</Trans>
        </Text>
      )}
    </div>
  );
}

const historyColumnHelper = createColumnHelper<HistoryEntry>();

function HistoryTable({ entries }: { entries: HistoryEntry[] }) {
  if (!entries.length) return null;

  const columns = [
    historyColumnHelper.accessor('timestamp', {
      id: 'timestamp',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Time`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} variant="both" />,
    }),
    historyColumnHelper.accessor('compositeScore', {
      id: 'score',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Score`} />,
      cell: ({ row }) => (
        <FraudScore
          score={row.original.compositeScore}
          decision={row.original.decision}
          size="sm"
        />
      ),
    }),
    historyColumnHelper.accessor('decision', {
      id: 'decision',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Decision`} />,
      cell: ({ getValue }) => <FraudDecisionBadge decision={getValue()} />,
    }),
    historyColumnHelper.accessor('trigger', {
      id: 'trigger',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Trigger`} />,
      cell: ({ getValue }) => (
        <Text size="xs" textColor="muted">
          {getValue() || '—'}
        </Text>
      ),
    }),
  ];

  return (
    <TableCard title={<Trans>Evaluation History</Trans>} className="gap-3 p-4">
      <DataTable.Client
        data={entries}
        columns={columns as ColumnDef<HistoryEntry, unknown>[]}
        pageSize={entries.length}
        getRowId={(row) => `${row.timestamp}-${row.compositeScore}-${row.decision}`}>
        <DataTable.Content
          headerClassName={LIST_TABLE_HEADER_CLASS}
          headerRowClassName={LIST_TABLE_HEADER_ROW_CLASS}
          headerCellClassName={EMBEDDED_TABLE_HEADER_CELL_CLASS}
          bodyClassName={EMBEDDED_TABLE_BODY_CLASS}
          rowClassName={LIST_TABLE_ROW_CLASS}
          cellClassName={EMBEDDED_TABLE_CELL_CLASS}
          emptyMessage={t`No history`}
        />
      </DataTable.Client>
    </TableCard>
  );
}

const userEvalColumnHelper = createColumnHelper<FraudEvaluation>();

export function UserEvaluationsTable({
  evaluations,
  currentName,
}: {
  evaluations: FraudEvaluation[];
  currentName: string;
}) {
  if (evaluations.length <= 1) return null;

  const columns = [
    userEvalColumnHelper.accessor((row) => row.metadata?.name, {
      id: 'name',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Evaluation`} />,
      cell: ({ row }) => {
        const name = row.original.metadata?.name ?? '';
        if (name === currentName) {
          return (
            <Text size="sm" weight="medium" className="font-mono">
              {name}{' '}
              <Text as="span" size="xs" textColor="muted" className="font-sans">
                {t`(current)`}
              </Text>
            </Text>
          );
        }
        return (
          <Link
            to={fraudRoutes.evaluations.detail(name)}
            className="text-primary font-mono text-sm hover:underline">
            {name}
          </Link>
        );
      },
    }),
    userEvalColumnHelper.accessor((row) => row.status?.phase, {
      id: 'phase',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Phase`} />,
      cell: ({ row }) => <BadgeState state={row.original.status?.phase ?? 'Pending'} />,
    }),
    userEvalColumnHelper.accessor((row) => row.status?.compositeScore, {
      id: 'score',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Score`} />,
      cell: ({ row }) => (
        <FraudScore
          score={row.original.status?.compositeScore}
          decision={row.original.status?.decision}
          size="sm"
        />
      ),
    }),
    userEvalColumnHelper.accessor((row) => row.status?.decision, {
      id: 'decision',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Decision`} />,
      cell: ({ row }) => <FraudDecisionBadge decision={row.original.status?.decision} />,
    }),
    userEvalColumnHelper.accessor((row) => row.status?.lastEvaluationTime, {
      id: 'evaluated',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`Evaluated`} />,
      cell: ({ row }) => <DateTime date={row.original.status?.lastEvaluationTime} variant="both" />,
    }),
  ];

  return (
    <TableCard title={<Trans>All Evaluations for this User</Trans>} className="gap-3 p-4">
      <DataTable.Client
        data={evaluations}
        columns={columns as ColumnDef<FraudEvaluation, unknown>[]}
        pageSize={evaluations.length}
        getRowId={(row) => row.metadata?.name ?? ''}>
        <DataTable.Content
          headerClassName={LIST_TABLE_HEADER_CLASS}
          headerRowClassName={LIST_TABLE_HEADER_ROW_CLASS}
          headerCellClassName={EMBEDDED_TABLE_HEADER_CELL_CLASS}
          bodyClassName={EMBEDDED_TABLE_BODY_CLASS}
          rowClassName={LIST_TABLE_ROW_CLASS}
          cellClassName={EMBEDDED_TABLE_CELL_CLASS}
          emptyMessage={t`No evaluations`}
        />
      </DataTable.Client>
    </TableCard>
  );
}

export function EvaluationBackLink() {
  return (
    <Link
      to={fraudRoutes.root()}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
      <ArrowLeft className="h-3 w-3" />
      <Trans>Back to evaluations</Trans>
    </Link>
  );
}

/**
 * Loading placeholder that mirrors the evaluation detail layout — header
 * (identity + the three verdict stats), the overview card, and the stage-results
 * card — so the page keeps its shape while data loads instead of a lone spinner.
 */
export function EvaluationDetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <EvaluationBackLink />

      {/* Header: identity + verdict stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-64" />
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-end gap-1.5">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Overview */}
      <SectionCard title={<Trans>Evaluation Overview</Trans>}>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Stage Results */}
      <SectionCard title={<Trans>Stage Results</Trans>}>
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-44" />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/** A muted em dash for an empty field — the house convention over the word "None". */
function EmptyValue() {
  return (
    <Text as="span" size="sm" textColor="muted">
      —
    </Text>
  );
}

type EvalCondition = NonNullable<FraudEvaluationStatus['conditions']>[number];

/**
 * Renders the evaluation's status conditions as colour-coded badges. A `Degraded`
 * condition (completed with provider errors) is amber; a healthy `Available` is
 * green; a failed condition is red. The condition message is surfaced on hover.
 */
function ConditionBadges({ conditions }: { conditions: EvalCondition[] }) {
  const stateFor = (c: EvalCondition): string => {
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

/**
 * A labelled stat in the header's verdict cluster: a small uppercase label over
 * its value, with the label explaining the stat's purpose on hover. The label
 * is what makes the bare Score/Phase/Decision badges self-describing.
 */
function HeaderStat({
  label,
  tooltip,
  children,
}: {
  label: ReactNode;
  tooltip?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <Text
        as="span"
        size="xs"
        textColor="muted"
        className={cn('font-medium tracking-wide uppercase', tooltip && 'cursor-help')}
        title={tooltip}>
        {label}
      </Text>
      {children}
    </div>
  );
}

/**
 * Detail-page header for a fraud evaluation: icon + evaluation name + what
 * triggered it and when, with the verdict (composite score, phase, decision)
 * pulled out to the right. Matches the `EntityHeader` house pattern used by the
 * org/user/project detail pages, which this leaf route can't get from a rail.
 */
export function EvaluationHeader({
  evaluation,
  userEmail,
}: {
  evaluation: FraudEvaluation;
  userEmail?: string;
}) {
  const name = evaluation.metadata?.name ?? '';
  const trigger = evaluation.status?.trigger;
  const evaluatedAt = evaluation.status?.lastEvaluationTime;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md">
          <ENTITY_ICONS.fraud className="size-5" />
        </div>
        <div className="flex min-w-0 flex-col">
          <Title level={5} className="truncate font-mono">
            {name}
          </Title>
          <Text
            size="sm"
            textColor="muted"
            className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {trigger && <span>{startCase(trigger)}</span>}
            {trigger && evaluatedAt && <span aria-hidden>·</span>}
            {evaluatedAt && (
              <span className="inline-flex items-center gap-1">
                <Trans>Evaluated</Trans>
                <DateTime date={evaluatedAt} variant="relative" />
              </span>
            )}
            {userEmail && (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Mail className="size-3" />
                  {userEmail}
                </span>
              </>
            )}
          </Text>
        </div>
      </div>
      <div className="flex shrink-0 items-start gap-6">
        <HeaderStat
          label={<Trans>Score</Trans>}
          tooltip={t`Overall fraud risk, 0 (low) to 100 (high) — the highest provider score across all stages.`}>
          <FraudScore
            score={evaluation.status?.compositeScore}
            decision={evaluation.status?.decision}
            size="xl"
          />
        </HeaderStat>
        <HeaderStat
          label={<Trans>Phase</Trans>}
          tooltip={t`How far the evaluation has run: Pending, Running, Completed, or Error.`}>
          <BadgeState state={evaluation.status?.phase ?? 'Pending'} />
        </HeaderStat>
        <HeaderStat
          label={<Trans>Decision</Trans>}
          tooltip={t`The fraud verdict from the score against policy thresholds: Accepted, Review, or Deactivate.`}>
          <FraudDecisionBadge decision={evaluation.status?.decision} />
        </HeaderStat>
      </div>
    </div>
  );
}

export function EvaluationOverview({
  evaluation,
  contactName,
  userEmail,
}: {
  evaluation: FraudEvaluation;
  contactName: string | null;
  userEmail?: string;
}) {
  const { spec, status, metadata } = evaluation;
  const policyName = spec.policyRef?.name;
  const policyVersion = spec.policyRef?.resourceVersion;
  const conditions = status?.conditions ?? [];

  const items: DescriptionListItem[] = [
    {
      label: <Trans>User</Trans>,
      value: (
        <Link
          to={userRoutes.detail(spec.userRef.name)}
          className="text-primary inline-flex items-center gap-1 hover:underline">
          <User className="size-3 shrink-0" />
          <DisplayId value={spec.userRef.name} />
        </Link>
      ),
    },
    {
      label: <Trans>Contact</Trans>,
      hidden: !contactName && !userEmail,
      value: (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {contactName && (
            <Text size="sm" weight="medium">
              {contactName}
            </Text>
          )}
          {userEmail && (
            <Text size="sm" textColor="muted" className="inline-flex items-center gap-1">
              <Mail className="size-3" />
              {userEmail}
            </Text>
          )}
        </div>
      ),
    },
    {
      label: <Trans>Policy</Trans>,
      hidden: !policyName,
      value: (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={fraudRoutes.policy()}
            className="text-primary inline-flex items-center gap-1 hover:underline">
            <FileText className="size-3 shrink-0" />
            {policyName}
          </Link>
          {policyVersion && (
            <Text as="span" size="xs" textColor="muted" className="font-mono">
              rev {policyVersion}
            </Text>
          )}
        </div>
      ),
    },
    {
      label: <Trans>Enforcement</Trans>,
      value: status?.enforcementAction ? (
        <BadgeState
          state={status.enforcementAction === 'OBSERVED' ? 'info' : 'active'}
          message={startCase(status.enforcementAction)}
        />
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
      label: <Trans>Evaluated</Trans>,
      hidden: !status?.lastEvaluationTime,
      value: <DateTime date={status?.lastEvaluationTime} variant="both" />,
    },
    {
      label: <Trans>Created</Trans>,
      hidden: !metadata?.creationTimestamp,
      value: <DateTime date={metadata?.creationTimestamp} variant="both" />,
    },
  ];

  return (
    <SectionCard title={<Trans>Evaluation Overview</Trans>}>
      <DescriptionList items={items} labelWidth="22%" />
    </SectionCard>
  );
}

export function StageResultsSection({
  stageResults,
  compositeScore,
}: {
  stageResults: StageResult[];
  compositeScore?: string;
}) {
  if (!stageResults.length) return null;

  return (
    <SectionCard title={<Trans>Stage Results</Trans>}>
      <div className="space-y-4">
        {stageResults.map((sr, i) => (
          <StageResultBlock
            key={sr.name}
            result={sr}
            index={i}
            isLast={i === stageResults.length - 1}
            compositeScore={compositeScore}
          />
        ))}
      </div>
    </SectionCard>
  );
}

export function EvaluationHistorySection({ entries }: { entries: HistoryEntry[] }) {
  return <HistoryTable entries={entries} />;
}
