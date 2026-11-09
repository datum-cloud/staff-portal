import { discountText, isContractResource, parseDiscount } from './contract';
import type {
  ComMiloapisBillingV1Alpha1Offer,
  ComMiloapisBillingV1Alpha1ServicePricing,
} from '@openapi/billing.miloapis.com/v1alpha1';

/**
 * The usage a contract bills: the platform's Usage pricings staff tick, one
 * per meter, each at its list rates with an optional discount, or at the
 * customer's own rates. Customer rates are a Usage pricing `basedOn` the
 * list one, which differs from it only in its rate amounts. See
 * milo-os/billing docs/enhancements/contract-billing.md#contract-usage-pricing.
 */

type ServicePricing = ComMiloapisBillingV1Alpha1ServicePricing;
type PricingSpec = NonNullable<ServicePricing['spec']>;
type OfferSpec = NonNullable<ComMiloapisBillingV1Alpha1Offer['spec']>;
type ServicePricingRef = NonNullable<OfferSpec['servicePricingRefs']>[number];
type PricingRate = NonNullable<PricingSpec['rates']>[number];

/** A meter the platform prices, with its list pricings, newest first. */
export interface UsageMeterOption {
  metric: string;
  serviceRef: string;
  label: string;
  pricingUnit: string;
  pricings: ServicePricing[];
}

const isListUsagePricing = (pricing: ServicePricing) =>
  pricing.spec?.chargeType === 'Usage' &&
  Boolean(pricing.spec.metric) &&
  !pricing.spec.basedOn &&
  !isContractResource(pricing);

const newestFirst = (a: ServicePricing, b: ServicePricing) =>
  (b.metadata?.creationTimestamp ?? '').localeCompare(a.metadata?.creationTimestamp ?? '') ||
  (b.metadata?.name ?? '').localeCompare(a.metadata?.name ?? '');

/**
 * The platform's usage pricings by meter: list pricings only, leaving out
 * customer pricings (with a `basedOn`) and anything made for a contract.
 */
export const listUsageMeterOptions = (pricings: ServicePricing[]): UsageMeterOption[] => {
  const byMetric = new Map<string, ServicePricing[]>();
  for (const pricing of pricings.filter(isListUsagePricing)) {
    const metric = pricing.spec?.metric ?? '';
    byMetric.set(metric, [...(byMetric.get(metric) ?? []), pricing]);
  }
  return [...byMetric.entries()]
    .map(([metric, list]) => {
      const sorted = [...list].sort(newestFirst);
      const newest = sorted[0];
      return {
        metric,
        serviceRef: newest.spec?.serviceRef ?? '',
        label: newest.spec?.displayName || metric,
        pricingUnit: newest.spec?.pricingUnit ?? '',
        pricings: sorted,
      };
    })
    .sort((a, b) => a.serviceRef.localeCompare(b.serviceRef) || a.label.localeCompare(b.label));
};

/**
 * Which usage a rate amount prices, for the component to put into words
 * (e.g. "runtime_class general-purpose, up to 100"). Empty for a pricing's
 * only flat rate, which prices every unit.
 */
export interface RateSlotLabel {
  /** The dimension value a matched rate prices. */
  match?: { dimension: string; value: string };
  /** A rate that prices everything its pricing's matched rates don't. */
  rest?: boolean;
  /** A tier band: up to a bound, over the previous band's, or all usage. */
  band?: { upTo: string } | { over: string } | 'all';
}

/** One rate amount a customer can set: a flat rate, or one tier band. */
export interface RateSlot {
  label: RateSlotLabel;
  /** The list pricing's amount, as a decimal string. */
  listAmount: string;
}

const bandLabel = (
  band: { upTo?: string },
  previous?: { upTo?: string }
): NonNullable<RateSlotLabel['band']> =>
  band.upTo ? { upTo: band.upTo } : previous?.upTo ? { over: previous.upTo } : 'all';

/**
 * A pricing's rate amounts in order, flat rates as one each and tiered ones
 * as one per band, with what each prices.
 */
export const rateSlots = (spec: PricingSpec | undefined): RateSlot[] =>
  (spec?.rates ?? []).flatMap((rate, index, rates) => {
    const scope: RateSlotLabel = rate.match
      ? { match: { dimension: rate.match.dimension, value: rate.match.value } }
      : rates.length > 1
        ? { rest: true }
        : {};
    if (rate.tiered?.length) {
      return rate.tiered.map((band, b) => ({
        label: { ...scope, band: bandLabel(band, rate.tiered?.[b - 1]) },
        listAmount: band.rate,
      }));
    }
    return [{ label: scope, listAmount: rate.flat ?? '' }];
  });

/** A pricing's rates with their amounts replaced, in rateSlots order. */
export const withRateAmounts = (
  rates: PricingRate[] | undefined,
  amounts: string[]
): PricingRate[] => {
  let i = 0;
  return (rates ?? []).map((rate) =>
    rate.tiered?.length
      ? {
          ...rate,
          tiered: rate.tiered.map((band) => ({ ...band, rate: amounts[i++] ?? band.rate })),
        }
      : { ...rate, flat: amounts[i++] ?? rate.flat }
  );
};

/** A rate amount billing accepts: a non-negative decimal, such as 0.000014. */
export const RATE_AMOUNT_PATTERN = /^(0|[1-9]\d*)(\.\d+)?$/;

/** A meter's row in the contract form. */
export interface UsageRow {
  metric: string;
  /** Whether the contract bills this meter. */
  selected: boolean;
  /** The list pricing billed, or that the customer's rates are based on. */
  pricingName: string;
  /** Percent off, as typed; empty for none. */
  discount: string;
  /** Whether the customer has their own rates. */
  custom: boolean;
  /** The customer's rate amounts, in rateSlots order. */
  amounts: string[];
  /**
   * The customer pricing the contract already bills, so an amendment that
   * keeps its rates reuses it rather than creating another.
   */
  currentPricing?: string;
}

const snapshotByName = (offer: ComMiloapisBillingV1Alpha1Offer | null | undefined) =>
  new Map((offer?.spec?.servicePricings ?? []).map((snap) => [snap.name, snap]));

/**
 * The form's starting rows: each meter ticked if `offer` bills it, with
 * its discount and, for customer rates, their amounts. Meters it doesn't
 * bill start unticked on their newest list pricing.
 */
export const usageRowsFromOffer = (
  options: UsageMeterOption[],
  offer: ComMiloapisBillingV1Alpha1Offer | null | undefined
): UsageRow[] => {
  const snapshots = snapshotByName(offer);
  const refs = offer?.spec?.servicePricingRefs ?? [];
  return options.map((option) => {
    const listNames = new Set(option.pricings.map((p) => p.metadata?.name ?? ''));
    const newest = option.pricings[0];
    const blank: UsageRow = {
      metric: option.metric,
      selected: false,
      pricingName: newest.metadata?.name ?? '',
      discount: '',
      custom: false,
      amounts: rateSlots(newest.spec).map((slot) => slot.listAmount),
    };
    for (const ref of refs) {
      const snap = snapshots.get(ref.name);
      if (listNames.has(ref.name)) {
        const list = option.pricings.find((p) => p.metadata?.name === ref.name);
        return {
          ...blank,
          selected: true,
          pricingName: ref.name,
          discount: discountText(ref.discount?.percentage),
          amounts: rateSlots(list?.spec).map((slot) => slot.listAmount),
        };
      }
      const basedOn = snap?.spec?.basedOn;
      if (basedOn && listNames.has(basedOn) && snap?.spec?.metric === option.metric) {
        return {
          ...blank,
          selected: true,
          pricingName: basedOn,
          discount: discountText(ref.discount?.percentage),
          custom: true,
          amounts: rateSlots(snap.spec).map((slot) => slot.listAmount),
          currentPricing: ref.name,
        };
      }
    }
    return blank;
  });
};

/**
 * The offer's usage refs that no row accounts for: a pricing that's no
 * longer on the price list (deleted, or being deleted), or a second pricing
 * for a meter a row already shows. An amendment keeps them as they are, so
 * the contract doesn't silently stop billing them. `rows` are the ones
 * usageRowsFromOffer built from the same offer.
 */
export const unclaimedUsageRefs = (
  rows: UsageRow[],
  offer: ComMiloapisBillingV1Alpha1Offer | null | undefined
): ServicePricingRef[] => {
  const claimed = new Set(
    rows
      .filter((row) => row.selected)
      .map((row) => (row.custom ? row.currentPricing : row.pricingName))
  );
  const snapshots = snapshotByName(offer);
  return (offer?.spec?.servicePricingRefs ?? []).filter(
    (ref) => snapshots.get(ref.name)?.spec?.chargeType === 'Usage' && !claimed.has(ref.name)
  );
};

/** A customer pricing to create for the contract, based on a list pricing. */
export interface CustomerUsagePricing {
  /** Where its ref goes among the contract's usage refs. */
  index: number;
  basedOn: string;
  spec: PricingSpec;
  discount?: number;
}

export interface UsagePlan {
  /**
   * The contract's usage refs, in form order. A customer pricing still to
   * be created has an empty name, filled in when it's created.
   */
  refs: ServicePricingRef[];
  /** Customer pricings to create, each filling the ref at its index. */
  create: CustomerUsagePricing[];
}

const sameAmounts = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, i) => Number(value) === Number(b[i]));

/**
 * What the ticked rows bill: a ref to each list pricing, or to the
 * customer's own. Rates left at the list price use the list pricing; rates
 * kept from the contract's current customer pricing reuse it.
 */
export const buildUsagePlan = (
  rows: UsageRow[],
  options: UsageMeterOption[],
  namespace: string,
  current?: ComMiloapisBillingV1Alpha1Offer | null
): UsagePlan => {
  const optionByMetric = new Map(options.map((option) => [option.metric, option]));
  const snapshots = snapshotByName(current);
  const plan: UsagePlan = { refs: [], create: [] };
  for (const row of rows) {
    if (!row.selected) continue;
    const option = optionByMetric.get(row.metric);
    const list = option?.pricings.find((p) => p.metadata?.name === row.pricingName);
    if (!list?.spec) continue;
    const discount = parseDiscount(row.discount);
    const ref = (name: string): ServicePricingRef => ({
      name,
      namespace,
      ...(discount ? { discount: { percentage: discount } } : {}),
    });
    const listAmounts = rateSlots(list.spec).map((slot) => slot.listAmount);
    if (!row.custom || sameAmounts(row.amounts, listAmounts)) {
      plan.refs.push(ref(row.pricingName));
      continue;
    }
    const kept = row.currentPricing ? snapshots.get(row.currentPricing) : undefined;
    if (
      kept?.spec?.basedOn === row.pricingName &&
      sameAmounts(
        row.amounts,
        rateSlots(kept.spec).map((slot) => slot.listAmount)
      )
    ) {
      plan.refs.push(ref(kept.name));
      continue;
    }
    plan.create.push({
      index: plan.refs.length,
      basedOn: row.pricingName,
      spec: {
        ...list.spec,
        basedOn: row.pricingName,
        rates: withRateAmounts(
          list.spec.rates,
          row.amounts.map((amount) => amount.trim())
        ),
      },
      discount,
    });
    plan.refs.push(ref(''));
  }
  return plan;
};
