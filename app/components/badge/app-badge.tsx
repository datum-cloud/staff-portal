import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';

/**
 * Compact uppercase badge matching Figma `Datum App UI/Badges`
 * (Open / Closed / In progress), plus registration aliases.
 *
 * @see https://www.figma.com/design/bBEQ8YeTP4SngNl5EkkQdH/Datum---Master-Design-File?node-id=13458-52787
 * @see https://www.figma.com/design/bBEQ8YeTP4SngNl5EkkQdH/Datum---Master-Design-File?node-id=13458-52788
 * @see https://www.figma.com/design/bBEQ8YeTP4SngNl5EkkQdH/Datum---Master-Design-File?node-id=13458-52789
 */
export type AppBadgeValue =
  'open' | 'closed' | 'in-progress' | 'pending' | 'approved' | 'rejected' | 'suspended';

type Props = {
  status: AppBadgeValue | string;
  /** Optional override for the chip label (still rendered uppercase). */
  label?: string;
  tooltip?: string;
  className?: string;
};

const BADGE_STYLES: Record<AppBadgeValue, { label: string; className: string }> = {
  // Figma: Open — rgba(194,128,128,0.2) / #b84848
  open: {
    label: 'Open',
    className: 'bg-chip-red-tint text-chip-red',
  },
  // Figma: Closed — rgba(184,184,184,0.2) / #90969c
  closed: {
    label: 'Closed',
    className: 'bg-chip-grey-tint text-chip-grey',
  },
  // Figma: In progress — rgba(194,159,128,0.2) / #d28d5b
  'in-progress': {
    label: 'In progress',
    className: 'bg-chip-orange-tint text-chip-orange',
  },
  // Registration aliases (same visual language)
  pending: {
    label: 'Pending',
    className: 'bg-chip-orange-tint text-chip-orange',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-chip-red-tint text-chip-red',
  },
  // Approved isn’t in the Figma badge set — same chip recipe with pine green
  approved: {
    label: 'Approved',
    // Dark text needs a lighter green on navy panels for contrast.
    className:
      'bg-chip-green-tint text-chip-green dark:bg-chip-green-tint-soft dark:text-chip-green-soft',
  },
  // Suspended — amber, distinct from pending's soft orange
  suspended: {
    label: 'Suspended',
    className: 'bg-chip-amber-tint text-chip-amber dark:text-chip-amber-soft',
  },
};

const ALIASES: Record<string, AppBadgeValue> = {
  open: 'open',
  closed: 'closed',
  'in-progress': 'in-progress',
  inprogress: 'in-progress',
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  declined: 'rejected',
  suspended: 'suspended',
};

function normalizeStatus(status: string): AppBadgeValue {
  return ALIASES[status.trim().toLowerCase()] ?? 'closed';
}

export default function AppBadge({ status, label, tooltip, className }: Props) {
  const normalized = normalizeStatus(String(status ?? ''));
  const style = BADGE_STYLES[normalized];
  const text = (label ?? style.label).toUpperCase();

  const chip = (
    <Text
      size="4xs"
      className={cn(
        // Figma: h 16, px 5, radius 3, 8px Medium, tracking 0.3, uppercase
        'inline-flex h-4 min-w-17.5 shrink-0 items-center justify-center rounded-[3px] px-1.25',
        'leading-4 font-medium tracking-[0.3px] uppercase',
        style.className,
        className
      )}>
      {text}
    </Text>
  );

  if (tooltip) {
    return (
      <Tooltip message={tooltip}>
        <span className="inline-flex cursor-help">{chip}</span>
      </Tooltip>
    );
  }

  return chip;
}
