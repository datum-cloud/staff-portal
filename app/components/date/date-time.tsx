import {
  formatAbsoluteDate,
  formatCombinedDate,
  formatRelativeDate,
  formatTimezoneDate,
  formatUTCDate,
  getTimestamp,
  getTimezoneAbbreviation,
  parseDate,
} from './formatters';
import type { DateTimeProps, FormatterOptions } from './types';
import { useApp } from '@/providers/app.provider';
import { getBrowserTimezone } from '@/utils/helpers/timezone.helper';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useEffect, useState } from 'react';

/**
 * Unified component for displaying dates in absolute, relative, or combined formats
 * with intelligent tooltip support and timezone awareness.
 *
 * @example
 * // Absolute date
 * <DateTime date={createdAt} />
 *
 * @example
 * // Relative time
 * <DateTime date={createdAt} variant="relative" />
 *
 * @example
 * // Combined format
 * <DateTime date={createdAt} variant="both" />
 */
export const DateTime = ({
  date,
  variant = 'detailed',
  format,
  addSuffix,
  tooltip = 'auto',
  timezone,
  disableTimezone = false,
  className,
  separator = ' ',
  disableHydrationProtection = false,
  showTooltip = true, // Legacy prop from DateFormat
}: DateTimeProps) => {
  const { settings } = useApp();
  const [mounted, setMounted] = useState(false);

  // Hydration protection for relative dates (client-side only)
  const needsHydrationProtection = variant === 'relative' || variant === 'both';

  // Hydration protection: defer client-only relative-date rendering until after
  // mount to prevent SSR/CSR mismatch. setState in effect is the standard
  // hydration-safe pattern for this case.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (needsHydrationProtection && !disableHydrationProtection) {
      setMounted(true);
    }
  }, [needsHydrationProtection, disableHydrationProtection]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!date) {
    return null;
  }

  // Parse and validate date
  const parsedDate = parseDate(date);

  if (!parsedDate) {
    return null;
  }

  // Show loading state during hydration
  if (needsHydrationProtection && !disableHydrationProtection && !mounted) {
    return <span className={cn('text-sm', className)}>...</span>;
  }

  // Prepare formatter options
  const timeZone = timezone ?? settings?.timezone ?? getBrowserTimezone();
  const formatterOptions: FormatterOptions = {
    timezone: timeZone,
    disableTimezone,
    format,
    addSuffix,
  };

  // Format content based on variant. `detailed` uses the friendly absolute
  // format in the cell; the tooltip still shows UTC / timezone / relative.
  let content: string;
  switch (variant) {
    case 'detailed':
    case 'absolute':
      content = formatAbsoluteDate(parsedDate, formatterOptions);
      break;
    case 'relative':
      content = formatRelativeDate(parsedDate, formatterOptions);
      break;
    case 'both':
      content = formatCombinedDate(parsedDate, formatterOptions, separator);
      break;
    default:
      content = formatAbsoluteDate(parsedDate, formatterOptions);
      break;
  }

  // Determine tooltip behavior
  const shouldShowTooltip = determineTooltipVisibility(tooltip, showTooltip);
  // Match surrounding table/body text — mono made long absolute dates feel oversized.
  const textClass = cn('text-sm', className);

  if (!shouldShowTooltip || disableTimezone) {
    return <span className={textClass}>{content}</span>;
  }

  // Determine tooltip content
  const tooltipContent = getTooltipContent(
    parsedDate,
    variant,
    tooltip,
    formatterOptions,
    timeZone
  );

  return (
    <Tooltip message={tooltipContent}>
      <span className={cn('cursor-pointer', textClass)}>{content}</span>
    </Tooltip>
  );
};

function renderDetailedTooltip(date: Date, options: FormatterOptions, timeZone: string) {
  const utcTime = formatUTCDate(date);
  const timezoneTime = formatTimezoneDate(date, timeZone);
  const relativeTime = formatRelativeDate(date, options);
  const timestamp = getTimestamp(date);

  const rows = [
    { label: 'UTC', value: utcTime },
    { label: timeZone.replace('_', ' '), value: timezoneTime },
    { label: 'Relative', value: relativeTime },
    { label: 'Timestamp', value: timestamp },
  ];

  return (
    <div className="space-y-2 text-xs">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-2">
          <span className="font-medium">{row.label}</span>
          <span className="mx-1 flex-1 border-b border-dotted border-current/50" />
          <span className="text-right">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Determines if tooltip should be shown
 */
function determineTooltipVisibility(
  tooltip: DateTimeProps['tooltip'],
  showTooltip: boolean
): boolean {
  if (typeof tooltip === 'boolean') {
    return tooltip;
  }

  // Legacy support for showTooltip prop
  if (tooltip === 'auto' && !showTooltip) {
    return false;
  }

  // Auto mode shows tooltip by default
  return true;
}

/**
 * Gets the appropriate tooltip content based on variant and mode
 */
function getTooltipContent(
  date: Date,
  variant: DateTimeProps['variant'],
  tooltip: DateTimeProps['tooltip'],
  options: FormatterOptions,
  timeZone: string
): React.ReactNode {
  // Detailed variant — show all time formats
  if (variant === 'detailed' || tooltip === 'detailed') {
    return renderDetailedTooltip(date, options, timeZone);
  }

  // Explicit timezone mode
  if (tooltip === 'timezone') {
    return (
      <p>
        {timeZone.replace('_', ' ')}&nbsp; ({getTimezoneAbbreviation(date, timeZone)})
      </p>
    );
  }

  // Alternate mode - show opposite format
  if (tooltip === 'alternate') {
    if (variant === 'relative') {
      return formatAbsoluteDate(date, options);
    }
    if (variant === 'absolute' || variant === 'both') {
      return formatRelativeDate(date, options);
    }
  }

  // Auto mode - intelligent defaults
  if (tooltip === 'auto' || tooltip === true) {
    switch (variant) {
      case 'relative':
        // Show absolute date for relative time
        return formatAbsoluteDate(date, options);

      case 'both':
        // Combined display already includes relative time — show full breakdown.
        return renderDetailedTooltip(date, options, timeZone);
      case 'absolute':
      default:
        // Show timezone info for absolute-only dates
        return (
          <p>
            {timeZone.replace('_', ' ')}&nbsp; ({getTimezoneAbbreviation(date, timeZone)})
          </p>
        );
    }
  }

  return null;
}
