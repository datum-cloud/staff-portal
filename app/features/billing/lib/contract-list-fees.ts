import {
  DEFAULT_FEE_BILLING_TIMING,
  discountText,
  isContractResource,
  parseAmount,
  parseDiscount,
  parsePeriods,
  toPricingAmount,
  type FeeBillingTiming,
  type FeeInterval,
} from './contract';
import type {
  ComMiloapisBillingV1Alpha1Offer,
  ComMiloapisBillingV1Alpha1ServicePricing,
} from '@openapi/billing.miloapis.com/v1alpha1';

/**
 * The fees on the platform's price list that a contract can charge: one-time
 * and monthly pricings that weren't made for a contract. Staff tick them with
 * a quantity and an optional discount, or give the customer their own
 * amount, which is a fee `basedOn` the list one so the list price stays
 * visible. See milo-os/billing
 * docs/enhancements/contract-billing.md#contract-fees-from-the-price-list.
 */

type ServicePricing = ComMiloapisBillingV1Alpha1ServicePricing;
type FeeChargeType = 'OneTime' | 'Recurring';

/** A fee on the price list. */
export interface ListFeeOption {
  /** The list pricing's name. */
  name: string;
  label: string;
  chargeType: FeeChargeType;
  /** The service it's for, or '' when it isn't for one. */
  serviceRef: string;
  /** What the amount is per, or ''. */
  pricingUnit: string;
  /** The list amount, as a decimal string. */
  amount: string;
  /** How often a recurring list fee is charged; unset for a one-time one. */
  interval?: FeeInterval;
}

const isFeeChargeType = (value: string | undefined): value is FeeChargeType =>
  value === 'OneTime' || value === 'Recurring';

/**
 * The price list's fees, by service, one-time first: list pricings only,
 * leaving out customer fees (with a `basedOn`) and anything made for a
 * contract.
 */
export const listFeeOptions = (pricings: ServicePricing[]): ListFeeOption[] =>
  pricings
    .flatMap((pricing): ListFeeOption[] => {
      const spec = pricing.spec;
      if (!spec || !isFeeChargeType(spec.chargeType)) return [];
      if (spec.basedOn || isContractResource(pricing) || !spec.amount) return [];
      const name = pricing.metadata?.name ?? '';
      return [
        {
          name,
          label: spec.displayName || name,
          chargeType: spec.chargeType,
          serviceRef: spec.serviceRef ?? '',
          pricingUnit: spec.pricingUnit ?? '',
          amount: spec.amount,
          ...(spec.chargeType === 'Recurring' ? { interval: spec.interval ?? 'monthly' } : {}),
        },
      ];
    })
    .sort(
      (a, b) =>
        a.serviceRef.localeCompare(b.serviceRef) ||
        (a.chargeType === b.chargeType ? 0 : a.chargeType === 'OneTime' ? -1 : 1) ||
        a.label.localeCompare(b.label)
    );

/** A list fee's row in the contract form. */
export interface ListFeeRow {
  /** The list pricing. */
  name: string;
  /** Whether the contract charges it. */
  selected: boolean;
  /** How many, as typed. */
  quantity: string;
  /** Percent off, as typed; empty for none. */
  discount: string;
  /** Whether the customer has their own amount. */
  custom: boolean;
  /** The customer's amount, as typed. */
  amount: string;
  /**
   * When the contract invoices a recurring list fee. It's the contract's
   * term, not the list fee's, so it's on the Offer's reference.
   */
  billingTiming: FeeBillingTiming;
  /** Renewals, as typed: how many periods a recurring list fee runs for; empty for no end. */
  periods: string;
  /**
   * The customer fee the contract already charges, so an amendment that
   * keeps its amount reuses it rather than creating another.
   */
  currentPricing?: string;
}

/**
 * The form's starting rows: each list fee ticked if `offer` charges it, or a
 * customer fee based on it, with its quantity, discount and timing. A row
 * takes the first such ref; any other for the same list fee is left to
 * listFeeNames. A ref without a timing is billed in advance, as billing
 * reads it; an unticked row starts in arrears, as new fees do.
 */
export const listFeeRowsFromOffer = (
  options: ListFeeOption[],
  offer: ComMiloapisBillingV1Alpha1Offer | null | undefined
): ListFeeRow[] => {
  const snapshots = new Map((offer?.spec?.servicePricings ?? []).map((s) => [s.name, s]));
  const refs = offer?.spec?.servicePricingRefs ?? [];
  return options.map((option) => {
    const blank: ListFeeRow = {
      name: option.name,
      selected: false,
      quantity: '1',
      discount: '',
      custom: false,
      amount: option.amount,
      billingTiming: DEFAULT_FEE_BILLING_TIMING,
      periods: '',
    };
    for (const ref of refs) {
      const snap = snapshots.get(ref.name);
      const quantity = String(snap?.quantity || ref.quantity || 1);
      const discount = discountText(ref.discount?.percentage);
      const billingTiming = ref.billingTiming ?? snap?.billingTiming ?? 'InAdvance';
      const periods = String(ref.periods || snap?.periods || '');
      if (ref.name === option.name) {
        return { ...blank, selected: true, quantity, discount, billingTiming, periods };
      }
      if (snap?.spec?.basedOn === option.name && isFeeChargeType(snap.spec.chargeType)) {
        return {
          ...blank,
          selected: true,
          quantity,
          discount,
          billingTiming,
          periods,
          custom: true,
          amount: snap.spec.amount ?? option.amount,
          currentPricing: ref.name,
        };
      }
    }
    return blank;
  });
};

/**
 * The offer's fees the price list's rows account for, from the rows
 * listFeeRowsFromOffer built for it. Any other fee, such as a second one
 * for the same list fee, or one whose list fee has gone, stays one of the
 * contract's own fees, so saving keeps it.
 */
export const listFeeNames = (rows: ListFeeRow[]): Set<string> =>
  new Set(
    rows
      .filter((row) => row.selected)
      .map((row) => (row.custom ? (row.currentPricing ?? '') : row.name))
      .filter(Boolean)
  );

/** A fee for the contract's Offer: a list fee, or the customer's own. */
export interface PlannedListFee {
  label: string;
  chargeType: FeeChargeType;
  /** The unit amount, as a USD decimal string. */
  amount: string;
  quantity: number;
  pricingUnit?: string;
  serviceRef?: string;
  /** Percent off, if any. */
  discount?: number;
  /** How often a recurring fee is charged: the list fee's interval. */
  interval?: FeeInterval;
  /** When a recurring fee is invoiced. */
  billingTiming?: FeeBillingTiming;
  /** How many periods a recurring fee runs for, when it has an end. */
  periods?: number;
  /** The pricing to refer to as it is: the list fee, or a kept customer fee. */
  existingPricing?: string;
  /** For a customer fee to create: the list fee it's based on. */
  basedOn?: string;
}

/** The amount a row charges for one, or NaN. */
export const listFeeRowAmount = (row: ListFeeRow, option: ListFeeOption) =>
  row.custom ? parseAmount(row.amount) : Number.parseFloat(option.amount);

/**
 * What the ticked rows charge: the list fee itself when its amount is
 * kept, the contract's current customer fee when that amount is kept, or
 * else a new customer fee based on the list one.
 */
export const buildListFeePlan = (
  rows: ListFeeRow[],
  options: ListFeeOption[],
  current?: ComMiloapisBillingV1Alpha1Offer | null
): PlannedListFee[] => {
  const optionByName = new Map(options.map((option) => [option.name, option]));
  const snapshots = new Map((current?.spec?.servicePricings ?? []).map((s) => [s.name, s]));
  return rows.flatMap((row): PlannedListFee[] => {
    const option = optionByName.get(row.name);
    if (!row.selected || !option) return [];
    const amount = listFeeRowAmount(row, option);
    const fee: PlannedListFee = {
      label: option.label,
      chargeType: option.chargeType,
      amount: option.amount,
      quantity: Number(row.quantity) || 1,
      pricingUnit: option.pricingUnit || undefined,
      serviceRef: option.serviceRef || undefined,
      discount: parseDiscount(row.discount),
      ...(option.chargeType === 'Recurring'
        ? {
            interval: option.interval ?? 'monthly',
            billingTiming: row.billingTiming,
            periods: parsePeriods(row.periods),
          }
        : {}),
    };
    if (!row.custom || amount === Number.parseFloat(option.amount)) {
      return [{ ...fee, existingPricing: option.name }];
    }
    const kept = row.currentPricing ? snapshots.get(row.currentPricing) : undefined;
    if (
      kept?.spec?.basedOn === option.name &&
      Number.parseFloat(kept.spec.amount ?? '') === amount
    ) {
      return [{ ...fee, amount: kept.spec.amount ?? '', existingPricing: kept.name }];
    }
    return [{ ...fee, amount: toPricingAmount(amount), basedOn: option.name }];
  });
};
