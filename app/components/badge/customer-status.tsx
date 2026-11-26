import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';

/**
 * Compact uppercase status chip matching Figma `Datum App UI/Customer Status`
 * (Active / Inactive / Flagged). Used in dense list Status columns.
 *
 * Colors are the Figma paint values (not theme tokens) — staff-portal's
 * `--glacier-mist-800` / `--app-dark-utility-*` resolve differently and washed
 * out the chip when used via `var(..., fallback)`.
 *
 * @see https://www.figma.com/design/bBEQ8YeTP4SngNl5EkkQdH/Datum---Master-Design-File?node-id=14534-63363
 */
export type CustomerStatusValue = 'active' | 'inactive' | 'flagged' | 'fraud' | 'failed';

type Props = {
  status: CustomerStatusValue | string;
  /** Optional override for the chip label (still rendered uppercase). */
  label?: string;
  tooltip?: string;
  className?: string;
};

const STATUS_STYLES: Record<CustomerStatusValue, { label: string; className: string }> = {
  active: {
    label: 'Active',
    // Light: Glacier Mist 800 / Utility 3. Dark: tinted chip (same recipe as AppBadge).
    className:
      'bg-chip-slate-wash text-chip-slate dark:bg-chip-slate-tint dark:text-chip-slate-soft',
  },
  inactive: {
    label: 'Inactive',
    // Light: Glacier Mist 700 / Utility 4 @ 60%. Dark: quieter tint + muted label.
    className:
      'bg-chip-grey-wash text-chip-grey/60 dark:bg-chip-grey-tint-faint dark:text-chip-grey',
  },
  flagged: {
    label: 'Fraud',
    className: 'bg-chip-red-wash text-chip-red dark:bg-chip-red-tint dark:text-chip-red-soft',
  },
  fraud: {
    label: 'Fraud',
    className: 'bg-chip-red-wash text-chip-red dark:bg-chip-red-tint dark:text-chip-red-soft',
  },
  failed: {
    label: 'Failed',
    className: 'bg-chip-red-wash text-chip-red dark:bg-chip-red-tint dark:text-chip-red-soft',
  },
};

function normalizeStatus(status: string): CustomerStatusValue {
  const key = status.trim().toLowerCase();
  if (key in STATUS_STYLES) return key as CustomerStatusValue;
  return 'inactive';
}

export default function CustomerStatus({ status, label, tooltip, className }: Props) {
  const normalized = normalizeStatus(String(status ?? ''));
  const style = STATUS_STYLES[normalized];
  const text = (label ?? style.label).toUpperCase();

  const chip = (
    <Text
      size="4xs"
      className={cn(
        // Figma: 54×16, px 5, radius 3, 8px Medium, tracking 0.3, uppercase
        'inline-flex h-4 w-13.5 shrink-0 items-center justify-center rounded-[3px] px-1.25',
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
