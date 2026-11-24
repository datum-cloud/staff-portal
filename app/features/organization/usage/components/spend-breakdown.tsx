import { formatCurrency, formatDiscount, spendDiscount } from '../usage.format';
import type { UsageSpend } from '@/modules/billing/usage.types';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';

/**
 * What a discounted spend cost before its discount, and what the discount
 * took off: `$412.30 before discount · −$412.30 (100% off)`. Renders nothing
 * when nothing was discounted.
 */
export function SpendBreakdown({ spend, className }: { spend?: UsageSpend; className?: string }) {
  const discount = spendDiscount(spend);
  if (!discount) return null;
  const before = formatCurrency(discount.beforeDiscounts);
  const off = formatDiscount(discount.discount);
  const percent = discount.percent;
  return (
    <Text as="p" size="xs" textColor="muted" className={cn('tabular-nums', className)}>
      <Trans>
        {before} before discount · {off} ({percent}% off)
      </Trans>
    </Text>
  );
}
