import { ButtonCopy } from '@/components/button';
import { cn } from '@datum-cloud/datum-ui/utils';

function truncateMiddle(str: string, maxLength = 16) {
  if (str.length <= maxLength) return str;
  const half = Math.floor((maxLength - 3) / 2);
  return `${str.slice(0, half)}...${str.slice(-half)}`;
}

interface IDDisplayProps {
  value: string;
  className?: string;
  /**
   * How a long id is shortened:
   * - `'middle'` (default): collapse to a fixed `head…tail` string regardless of
   *   width (e.g. `emailn...3a3ar9`).
   * - `'fit'`: render the full id and let CSS ellipsize it only when it actually
   *   overflows the column — so it uses whatever width is available instead of
   *   clipping to a fixed length. Pair with a column `maxSize` to bound how wide
   *   it can get.
   */
  truncate?: 'fit' | 'middle';
  /** Character budget when `truncate="middle"`. */
  maxLength?: number;
}

function IDDisplay({ value, className, truncate = 'middle', maxLength = 16 }: IDDisplayProps) {
  const isMiddle = truncate === 'middle';
  return (
    <div className={cn('flex min-w-0 items-center space-x-2', className)}>
      <span
        className={cn('font-mono text-xs', isMiddle ? 'whitespace-nowrap' : 'min-w-0 truncate')}
        title={value}>
        {isMiddle ? truncateMiddle(value, maxLength) : value}
      </span>
      <span className="shrink-0">
        <ButtonCopy value={value} />
      </span>
    </div>
  );
}

export default IDDisplay;
