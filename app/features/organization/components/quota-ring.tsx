import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { InfinityIcon } from 'lucide-react';

export const QUOTA_INDICATOR_SIZE = 18;

type QuotaRingProps = {
  used: number;
  limit: number;
  size?: number;
  className?: string;
};

/**
 * Quota ring when a limit exists; muted infinity when unlimited.
 * Ported from cloud-portal's usage summary indicator.
 */
export function QuotaIndicator({
  used,
  limit,
  size = QUOTA_INDICATOR_SIZE,
  className,
}: QuotaRingProps) {
  if (limit <= 0) {
    return (
      <Tooltip message="No limit">
        <span
          className={cn('inline-flex shrink-0 items-center justify-center', className)}
          style={{ width: size, height: size }}
          aria-label="No quota limit">
          <Icon
            icon={InfinityIcon}
            className={cn('text-muted-foreground', size >= 22 ? 'size-4' : 'size-3.5')}
          />
        </span>
      </Tooltip>
    );
  }

  return <QuotaRing used={used} limit={limit} size={size} className={className} />;
}

export function QuotaRing({ used, limit, size = 18, className }: QuotaRingProps) {
  const ratio = limit > 0 ? Math.min(1, Math.max(0, used / limit)) : 0;
  const strokeWidth = Math.max(2, Math.round(size / 9));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  const isFull = ratio >= 0.999;
  const pct = Math.round(ratio * 100);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('shrink-0', className)}
      role="img"
      aria-label={`${pct}% of quota used`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={strokeWidth}
      />
      {ratio > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isFull ? 'var(--destructive)' : 'var(--primary)'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </svg>
  );
}
