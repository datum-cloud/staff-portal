import { CardRowSkeleton } from './card-row-skeleton';
import { BadgeState } from '@/components/badge';
import {
  describeServicePricingRates,
  formatChargeType,
  getServicePricingDisplayName,
  getServicePricingSubtext,
} from '@/features/billing/utils';
import { SectionCard } from '@/features/milo';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1ServicePricing } from '@openapi/billing.miloapis.com/v1alpha1';
import { Tag } from 'lucide-react';

/** Every rate a pricing charges: matched rates under their dimension, tiers band by band. */
function PricingRates({ pricing }: { pricing: ComMiloapisBillingV1Alpha1ServicePricing }) {
  const lines = describeServicePricingRates(pricing);
  if (lines.length === 0) return null;

  return (
    <div className="mt-1 flex flex-col gap-1.5">
      {lines.map((line, i) => (
        <div key={i} className="flex flex-col">
          {line.label ? (
            <Text size="xs" className="font-mono">
              {line.label}
            </Text>
          ) : null}
          {line.prices.map((price) => (
            <Text
              key={price}
              size="xs"
              textColor="muted"
              className={line.label ? 'pl-3' : undefined}>
              {price}
            </Text>
          ))}
        </div>
      ))}
    </div>
  );
}

type ServicePricingsListProps = {
  pricings: ComMiloapisBillingV1Alpha1ServicePricing[];
};

function ServicePricingsList({ pricings }: ServicePricingsListProps) {
  if (pricings.length === 0) {
    return (
      <Text size="sm" textColor="muted" className="italic">
        <Trans>
          No prices for this service in this environment. Add ServicePricing manifests to the
          service&apos;s repo, and they will show up here once Flux applies them.
        </Trans>
      </Text>
    );
  }

  return (
    <div className="flex flex-col divide-y">
      {pricings.map((pricing) => {
        const name = pricing.metadata?.name ?? '';
        const displayName = getServicePricingDisplayName(pricing);
        const subtext = getServicePricingSubtext(pricing, displayName);
        const metric = pricing.spec?.metric;
        return (
          <div key={name} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <Text size="sm" className="font-medium">
                {displayName}
              </Text>
              {pricing.spec?.chargeType ? (
                <BadgeState state={formatChargeType(pricing.spec.chargeType)} />
              ) : null}
            </div>
            {subtext ? (
              <Text size="xs" textColor="muted" className="font-mono">
                {subtext}
              </Text>
            ) : null}
            {metric ? (
              <Text size="xs" textColor="muted" className="font-mono">
                {metric}
              </Text>
            ) : null}
            <PricingRates pricing={pricing} />
          </div>
        );
      })}
    </div>
  );
}

type ServicePricingsCardProps = {
  pricings: ComMiloapisBillingV1Alpha1ServicePricing[];
  isLoading?: boolean;
  errorMessage?: string;
};

export function ServicePricingsCard({
  pricings,
  isLoading,
  errorMessage,
}: ServicePricingsCardProps) {
  return (
    <SectionCard
      className="h-full"
      title={
        <span className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          <Trans>Pricing</Trans>
        </span>
      }
      description={
        <Text size="sm" textColor="muted">
          <Trans>
            Read-only. Prices are ServicePricing manifests in the service&apos;s repo, one set per
            environment, and billing reviews every change.
          </Trans>
        </Text>
      }>
      {isLoading ? (
        <CardRowSkeleton count={2} />
      ) : errorMessage ? (
        <div className="flex flex-col gap-1">
          <Text size="sm" textColor="muted">
            <Trans>Couldn&apos;t load prices for this service.</Trans>
          </Text>
          <Text size="xs" textColor="muted" className="font-mono">
            {errorMessage}
          </Text>
        </div>
      ) : (
        <ServicePricingsList pricings={pricings} />
      )}
    </SectionCard>
  );
}
