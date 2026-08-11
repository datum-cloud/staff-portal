import { BadgeState } from '@/components/badge';
import { formatChargeType } from '@/features/billing/utils';
import { SectionCard } from '@/features/milo';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisServicesV1Alpha1ServiceCharge } from '@openapi/services.miloapis.com/v1alpha1';
import { Tag } from 'lucide-react';
import type { ReactNode } from 'react';

function summarizeCharge(charge: ComMiloapisServicesV1Alpha1ServiceCharge): string {
  if (charge.chargeType === 'Usage' && charge.usage) {
    const unit = charge.usage.pricingUnit;
    const parts = charge.usage.rates.map((rate) => {
      const match = rate.match ? `${rate.match.dimension}=${rate.match.value}` : 'default';
      if (rate.flat) return `${match}: $${rate.flat}/${unit}`;
      if (rate.tiered?.length) return `${match}: ${rate.tiered.length} tiers`;
      return match;
    });
    if (parts.length === 0) return charge.usage.metricRef;
    if (parts.length <= 3) return parts.join(' · ');
    return `${parts.slice(0, 2).join(' · ')} · +${parts.length - 2} more`;
  }
  if (charge.chargeType === 'OneTime' && charge.oneTime) {
    return `$${charge.oneTime.amount} · ${charge.oneTime.trigger}`;
  }
  if (charge.chargeType === 'Recurring' && charge.recurring) {
    return `$${charge.recurring.amount} / ${charge.recurring.interval}`;
  }
  return '—';
}

type ChargesListProps = {
  charges: ComMiloapisServicesV1Alpha1ServiceCharge[];
  isPublished?: boolean;
};

export function ChargesList({ charges, isPublished }: ChargesListProps) {
  if (charges.length === 0) {
    return (
      <Text size="sm" textColor="muted" className="italic">
        <Trans>
          No charges yet. Add Usage, OneTime, or Recurring prices — ChargeFanOut creates
          ServicePricing objects in milo-system for Offers to pick up.
        </Trans>
      </Text>
    );
  }

  return (
    <div className="flex flex-col divide-y">
      {charges.map((charge) => (
        <div key={charge.name} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <Text size="sm" className="font-medium">
              {charge.displayName ?? charge.name}
            </Text>
            <BadgeState state={formatChargeType(charge.chargeType)} />
            {isPublished ? <BadgeState state="info" message="Immutable" /> : null}
          </div>
          <Text size="xs" textColor="muted" className="font-mono">
            {charge.name}
          </Text>
          <Text size="xs" textColor="muted">
            {summarizeCharge(charge)}
          </Text>
        </div>
      ))}
    </div>
  );
}

type ChargesCardProps = {
  charges: ComMiloapisServicesV1Alpha1ServiceCharge[];
  isLoading?: boolean;
  isPublished?: boolean;
  action?: ReactNode;
};

export function ChargesCard({ charges, isLoading, isPublished, action }: ChargesCardProps) {
  return (
    <SectionCard
      className="h-full"
      title={
        <span className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          <Trans>Charges</Trans>
        </span>
      }
      action={action}>
      {isLoading ? (
        <Text size="sm" textColor="muted">
          <Trans>Loading…</Trans>
        </Text>
      ) : (
        <ChargesList charges={charges} isPublished={isPublished} />
      )}
    </SectionCard>
  );
}
