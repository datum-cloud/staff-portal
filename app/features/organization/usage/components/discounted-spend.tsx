import { formatCurrency, formatDiscount, spendDiscount } from '../usage.format';
import { SpendValue } from './spend-value';
import type { UsageSpend } from '@/modules/billing/usage.types';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';

/**
 * What usage costs. When a discount took something off, the amount before
 * it is struck through beside the cost, with the discount on hover:
 * ~~$19.57~~ $0.
 */
export function DiscountedSpend({
  spend,
  spendError,
  className,
  beforeClassName,
}: {
  spend?: UsageSpend;
  /** Why the spend could not be computed. */
  spendError?: string;
  /** Classes for the cost. */
  className?: string;
  /** Classes for the amount before the discount. */
  beforeClassName?: string;
}) {
  const discount = spendDiscount(spend);
  const off = discount ? formatDiscount(discount.discount) : '';
  const percent = discount?.percent ?? 0;
  return (
    <>
      {discount ? (
        <Tooltip message={t`${off} (${percent}% off)`}>
          <span
            className={cn(
              'text-muted-foreground mr-1.5 cursor-help tabular-nums line-through',
              beforeClassName
            )}>
            {formatCurrency(discount.beforeDiscounts)}
          </span>
        </Tooltip>
      ) : null}
      <SpendValue spend={spend} spendError={spendError} className={className} />
    </>
  );
}
