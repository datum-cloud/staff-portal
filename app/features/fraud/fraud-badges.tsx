import { BadgeState } from '@/components/badge';
import { startCase } from '@/utils/helpers';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';

type Decision = string | null | undefined;

/**
 * Text colour for a fraud composite score, keyed off the evaluation decision.
 * Single source of truth — used by <FraudScore> and anywhere a score is shown.
 */
export function fraudDecisionColor(decision: Decision): string {
  if (decision === 'DEACTIVATE') return 'text-red-600 dark:text-red-400';
  if (decision === 'REVIEW') return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

/** Maps a fraud decision to a BadgeState colour: accepted → green, review → amber, deactivate → red. */
function decisionState(decision: Decision): 'success' | 'warning' | 'error' {
  if (decision === 'DEACTIVATE') return 'error';
  if (decision === 'REVIEW') return 'warning';
  return 'success';
}

/**
 * A fraud composite score, coloured by its decision. Renders an em dash when
 * there is no score. `size="xl"` for detail views, `"sm"` for table cells.
 */
export function FraudScore({
  score,
  decision,
  size = 'sm',
  className,
}: {
  score?: string | number | null;
  decision?: Decision;
  size?: 'sm' | 'xl';
  className?: string;
}) {
  if (score == null || score === '') {
    return (
      <Text as="span" textColor="muted" className={className}>
        —
      </Text>
    );
  }
  return (
    <Text
      as="span"
      className={cn(
        'font-mono',
        size === 'xl' ? 'text-2xl font-bold' : 'text-sm font-medium',
        fraudDecisionColor(decision),
        className
      )}>
      {score}
    </Text>
  );
}

/** A fraud decision as a colour-coded badge. Renders an em dash when unset. */
export function FraudDecisionBadge({ decision }: { decision?: Decision }) {
  if (!decision) {
    return (
      <Text as="span" textColor="muted">
        —
      </Text>
    );
  }
  return <BadgeState state={decisionState(decision)} message={startCase(decision)} />;
}
