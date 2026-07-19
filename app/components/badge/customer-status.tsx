import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
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
export type CustomerStatusValue = 'active' | 'inactive' | 'flagged' | 'fraud';

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
    className: 'bg-[#efefed] text-[#67717c] dark:bg-[rgba(227,226,223,0.16)] dark:text-[#c8ccc8]',
  },
  inactive: {
    label: 'Inactive',
    // Light: Glacier Mist 700 / Utility 4 @ 60%. Dark: quieter tint + muted label.
    className:
      'bg-[#f6f6f5] text-[#90969c]/60 dark:bg-[rgba(184,184,184,0.12)] dark:text-[#90969c]',
  },
  flagged: {
    label: 'Fraud',
    className: 'bg-[#ecdfde] text-[#b84848] dark:bg-[rgba(194,128,128,0.2)] dark:text-[#d47878]',
  },
  fraud: {
    label: 'Fraud',
    className: 'bg-[#ecdfde] text-[#b84848] dark:bg-[rgba(194,128,128,0.2)] dark:text-[#d47878]',
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
    <span
      className={cn(
        // Figma: 54×16, px 5, radius 3, 8px Medium, tracking 0.3, uppercase
        'inline-flex h-4 w-[54px] shrink-0 items-center justify-center rounded-[3px] px-[5px]',
        'text-[8px] leading-4 font-medium tracking-[0.3px] uppercase',
        style.className,
        className
      )}>
      {text}
    </span>
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
