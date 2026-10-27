import type { ComMiloapisBillingV1Alpha1Offer } from '@openapi/billing.miloapis.com/v1alpha1';
import { z } from 'zod';

/**
 * Discounts staff set on a Draft Offer (milo-os/billing Offer). The general
 * discount (spec.discount) applies to every service in the Offer; a service's
 * own discount (spec.servicePricingRefs[].discount) overrides it. Publishing
 * to GA snapshots the resolved discount into spec.servicePricings.
 */
type OfferSpec = NonNullable<ComMiloapisBillingV1Alpha1Offer['spec']>;
export type OfferDiscount = NonNullable<OfferSpec['discount']>;
export type OfferServicePricingRef = NonNullable<OfferSpec['servicePricingRefs']>[number];

export const MAX_DISCOUNT_PERCENTAGE = 100;

/**
 * A discount percentage as typed into a form: a whole number from 0 to 100,
 * or '' for no discount at that level. On a service, '' means it inherits the
 * general discount.
 */
export const discountPercentageSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'Enter a whole number from 0 to 100')
  .refine(
    (value) => Number(value) <= MAX_DISCOUNT_PERCENTAGE,
    `Discount must be ${MAX_DISCOUNT_PERCENTAGE}% or less`
  )
  .or(z.literal(''))
  .optional();

export type OfferDiscountFormValues = {
  /** General discount percentage; '' for none. */
  general: string;
  /** Override percentage by ServicePricing name; '' or missing inherits. */
  overrides: Record<string, string>;
};

export type ResolvedServiceDiscount = {
  percentage: number;
  /** Where the percentage comes from: the service's override, the Offer's general discount, or neither. */
  source: 'override' | 'general' | 'none';
};

const toDiscount = (value: string | undefined): OfferDiscount | undefined => {
  const trimmed = value?.trim();
  return trimmed ? { percentage: Number(trimmed) } : undefined;
};

/** A service's discount: its own override, else the general discount, else 0%. */
export function resolveServiceDiscount(
  ref: Pick<OfferServicePricingRef, 'discount'>,
  offerDiscount?: OfferDiscount
): ResolvedServiceDiscount {
  if (ref.discount) return { percentage: ref.discount.percentage, source: 'override' };
  if (offerDiscount) return { percentage: offerDiscount.percentage, source: 'general' };
  return { percentage: 0, source: 'none' };
}

/**
 * Offer spec fields for the discount form. Each ref gets a discount only when
 * its override is set; existing ref discounts are replaced, so a cleared
 * override inherits again. Overrides for services not in refs are dropped.
 */
export function buildOfferDiscountSpec(
  values: OfferDiscountFormValues,
  refs: OfferServicePricingRef[]
): { discount?: OfferDiscount; servicePricingRefs: OfferServicePricingRef[] } {
  const discount = toDiscount(values.general);
  return {
    ...(discount ? { discount } : {}),
    servicePricingRefs: refs.map(({ discount: _previous, ...ref }) => {
      const override = toDiscount(values.overrides[ref.name]);
      return override ? { ...ref, discount: override } : ref;
    }),
  };
}
