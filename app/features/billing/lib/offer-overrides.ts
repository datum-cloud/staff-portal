import type { FeeInterval } from './contract';
import { rateSlots, type RateSlotLabel } from './contract-usage';
import type {
  ComMiloapisBillingV1Alpha1Offer,
  ComMiloapisBillingV1Alpha1ServicePricing,
} from '@openapi/billing.miloapis.com/v1alpha1';

/**
 * Where an Offer's prices differ from the platform's price list: a
 * customer's own fee amount or usage rates (a pricing `basedOn` the list
 * one), and a discount on one pricing rather than the whole Offer. Fees made
 * for a contract that aren't on the price list aren't overrides; the
 * contract lists them.
 */

/** One rate a customer's usage pricing sets, beside the list pricing's. */
export interface RateOverride {
  label: RateSlotLabel;
  amount: string;
  /** The list pricing's amount for the same rate, when it can be read. */
  listAmount?: string;
}

export interface PriceOverride {
  /** The Offer's pricing. */
  name: string;
  label: string;
  chargeType: 'OneTime' | 'Recurring' | 'Usage';
  /** What a fee's or rate's amount is per. */
  pricingUnit?: string;
  /** A recurring fee's interval. */
  interval?: FeeInterval;
  /** A fee's own amount, and the list amount, when it has one. */
  fee?: { amount: string; listAmount?: string };
  /** A usage pricing's rates that differ from the list's, in order. */
  rates?: RateOverride[];
  /** Percent off this pricing alone, set on the Offer's reference. */
  discount?: number;
}

type Pricing = ComMiloapisBillingV1Alpha1ServicePricing;

/**
 * The Offer's prices that differ from the list, in the Offer's order. Read
 * from its snapshot, with `listPricings` for the list amounts beside them.
 * Per-pricing discounts come from its references: billing copies an
 * Offer-wide discount into every snapshot, so the snapshot can't tell them
 * apart.
 */
export const getOfferOverrides = (
  offer: ComMiloapisBillingV1Alpha1Offer | null | undefined,
  listPricings: Pricing[]
): PriceOverride[] => {
  const listByName = new Map(listPricings.map((p) => [p.metadata?.name ?? '', p]));
  const refByName = new Map((offer?.spec?.servicePricingRefs ?? []).map((ref) => [ref.name, ref]));
  return (offer?.spec?.servicePricings ?? []).flatMap((snapshot): PriceOverride[] => {
    const spec = snapshot.spec;
    if (!spec?.chargeType) return [];
    const discount = refByName.get(snapshot.name)?.discount?.percentage || undefined;
    const list = spec.basedOn ? listByName.get(spec.basedOn)?.spec : undefined;
    const override: PriceOverride = {
      name: snapshot.name,
      label: spec.displayName || spec.metric || snapshot.name,
      chargeType: spec.chargeType,
      pricingUnit: spec.pricingUnit || undefined,
      ...(spec.chargeType === 'Recurring' ? { interval: spec.interval ?? 'monthly' } : {}),
      discount,
    };
    if (spec.basedOn) {
      if (spec.chargeType === 'Usage') {
        const listSlots = rateSlots(list);
        const rates = rateSlots(spec)
          .map((slot, i) => ({
            label: slot.label,
            amount: slot.listAmount,
            listAmount: listSlots[i]?.listAmount,
          }))
          .filter((rate) => rate.amount !== rate.listAmount);
        return [{ ...override, rates }];
      }
      return [{ ...override, fee: { amount: spec.amount ?? '', listAmount: list?.amount } }];
    }
    return discount ? [override] : [];
  });
};
