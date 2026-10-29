import {
  getDiscountError,
  type OfferDiscountFormValues,
} from '@/features/billing/lib/offer-discounts';
import { getServicePricingDisplayName } from '@/features/billing/utils';
import { Input } from '@datum-cloud/datum-ui/input';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1ServicePricing } from '@openapi/billing.miloapis.com/v1alpha1';
import { useMemo } from 'react';

type OfferDiscountsFieldsProps = {
  value: OfferDiscountFormValues;
  onChange: (next: OfferDiscountFormValues) => void;
  pricings: ComMiloapisBillingV1Alpha1ServicePricing[];
  /** ServicePricings selected for the Offer; only these get an override input. */
  selectedNames: string[];
};

function PercentageInput({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  placeholder?: string;
  onChange: (next: string) => void;
}) {
  const error = getDiscountError(value);
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <Input
          id={id}
          inputMode="numeric"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          className="h-8 w-20 text-right"
        />
        <Text size="sm" textColor="muted">
          %
        </Text>
      </div>
      {error ? (
        <Text as="p" size="xs" className="text-destructive">
          {error}
        </Text>
      ) : null}
    </div>
  );
}

/**
 * Discounts for a Draft Offer: a general discount for every service, and an
 * optional override per selected service. An empty override inherits the
 * general discount.
 */
export function OfferDiscountsFields({
  value,
  onChange,
  pricings,
  selectedNames,
}: OfferDiscountsFieldsProps) {
  const pricingsByName = useMemo(
    () => new Map(pricings.map((pricing) => [pricing.metadata?.name ?? '', pricing])),
    [pricings]
  );
  // What an empty override inherits; an invalid general discount counts as none.
  const inheritedPercentage = (getDiscountError(value.general) ? '' : value.general.trim()) || '0';

  const setOverride = (name: string, next: string) =>
    onChange({ ...value, overrides: { ...value.overrides, [name]: next } });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <label htmlFor="offer-discount-general">
            <Text size="sm" weight="medium">
              <Trans>General discount</Trans>
            </Text>
          </label>
          <Text as="p" size="xs" textColor="muted" className="mt-0.5 leading-relaxed">
            <Trans>Applies to every service without its own discount. Leave empty for none.</Trans>
          </Text>
        </div>
        <PercentageInput
          id="offer-discount-general"
          value={value.general}
          placeholder="0"
          onChange={(general) => onChange({ ...value, general })}
        />
      </div>

      <div>
        <Text size="sm" weight="medium">
          <Trans>Per-service discounts</Trans>
        </Text>
        <Text as="p" size="xs" textColor="muted" className="mt-0.5 leading-relaxed">
          <Trans>Overrides the general discount. Leave empty to inherit it.</Trans>
        </Text>
        {selectedNames.length === 0 ? (
          <Text as="p" size="sm" textColor="muted" className="mt-3">
            <Trans>Select service pricings to set per-service discounts.</Trans>
          </Text>
        ) : (
          <ul className="mt-2 divide-y rounded-md border">
            {selectedNames.map((name) => {
              const pricing = pricingsByName.get(name);
              const inputId = `offer-discount-${name}`;
              const override = value.overrides[name] ?? '';
              return (
                <li key={name} className="flex items-start justify-between gap-4 p-3">
                  <label htmlFor={inputId} className="min-w-0">
                    <Text weight="medium">
                      {pricing ? getServicePricingDisplayName(pricing) : name}
                    </Text>
                    <Text as="p" size="xs" textColor="muted" className="mt-0.5">
                      {override.trim() ? (
                        <Trans>Overrides the general discount</Trans>
                      ) : (
                        <Trans>Inherits {inheritedPercentage}%</Trans>
                      )}
                    </Text>
                  </label>
                  <PercentageInput
                    id={inputId}
                    value={override}
                    placeholder={inheritedPercentage}
                    onChange={(next) => setOverride(name, next)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
