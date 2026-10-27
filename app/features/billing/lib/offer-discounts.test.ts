import {
  buildOfferDiscountSpec,
  discountPercentageSchema,
  resolveServiceDiscount,
  type OfferServicePricingRef,
} from './offer-discounts';
import { describe, expect, it } from 'vitest';

const refs: OfferServicePricingRef[] = [
  { name: 'compute-cpu', namespace: 'milo-system' },
  { name: 'object-storage', namespace: 'milo-system' },
];

describe('discountPercentageSchema', () => {
  it.each(['0', '20', '100', ' 50 ', ''])('accepts %j', (value) => {
    expect(discountPercentageSchema.safeParse(value).success).toBe(true);
  });

  it.each(['-1', '101', '12.5', 'abc', '1e2'])('rejects %j', (value) => {
    expect(discountPercentageSchema.safeParse(value).success).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(discountPercentageSchema.safeParse(20).success).toBe(false);
  });
});

describe('buildOfferDiscountSpec', () => {
  it('sets only the general discount', () => {
    expect(buildOfferDiscountSpec({ general: '20', overrides: {} }, refs)).toEqual({
      discount: { percentage: 20 },
      servicePricingRefs: refs,
    });
  });

  it('sets only a per-service override', () => {
    expect(
      buildOfferDiscountSpec({ general: '', overrides: { 'compute-cpu': '100' } }, refs)
    ).toEqual({
      servicePricingRefs: [
        { name: 'compute-cpu', namespace: 'milo-system', discount: { percentage: 100 } },
        { name: 'object-storage', namespace: 'milo-system' },
      ],
    });
  });

  it('sets a general discount with per-service overrides', () => {
    expect(
      buildOfferDiscountSpec(
        { general: '20', overrides: { 'compute-cpu': '100', 'object-storage': '' } },
        refs
      )
    ).toEqual({
      discount: { percentage: 20 },
      servicePricingRefs: [
        { name: 'compute-cpu', namespace: 'milo-system', discount: { percentage: 100 } },
        { name: 'object-storage', namespace: 'milo-system' },
      ],
    });
  });

  it('keeps a 0% override, which stops the service inheriting', () => {
    expect(
      buildOfferDiscountSpec({ general: '20', overrides: { 'compute-cpu': '0' } }, refs)
        .servicePricingRefs[0]
    ).toEqual({ name: 'compute-cpu', namespace: 'milo-system', discount: { percentage: 0 } });
  });

  it('removes a cleared override and drops overrides for services not in the Offer', () => {
    expect(
      buildOfferDiscountSpec({ general: '', overrides: { 'compute-cpu': '', gpu: '50' } }, [
        { name: 'compute-cpu', discount: { percentage: 30 } },
      ])
    ).toEqual({ servicePricingRefs: [{ name: 'compute-cpu' }] });
  });
});

describe('resolveServiceDiscount', () => {
  it("uses the service's override first", () => {
    expect(resolveServiceDiscount({ discount: { percentage: 100 } }, { percentage: 20 })).toEqual({
      percentage: 100,
      source: 'override',
    });
  });

  it('inherits the general discount', () => {
    expect(resolveServiceDiscount({}, { percentage: 20 })).toEqual({
      percentage: 20,
      source: 'general',
    });
  });

  it('is 0% when neither is set', () => {
    expect(resolveServiceDiscount({})).toEqual({ percentage: 0, source: 'none' });
  });
});
