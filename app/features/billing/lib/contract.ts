import type {
  ComMiloapisBillingV1Alpha1BillingEntitlement,
  ComMiloapisBillingV1Alpha1Invoice,
  ComMiloapisBillingV1Alpha1Offer,
} from '@openapi/billing.miloapis.com/v1alpha1';

/**
 * Contracts: a negotiated set fee, a one-time setup fee and a monthly charge,
 * billed from a start date set on the account's BillingEntitlement. See
 * milo-os/billing docs/enhancements/contract-billing.md.
 */

type OfferSpec = NonNullable<ComMiloapisBillingV1Alpha1Offer['spec']>;
type ServicePricingRef = NonNullable<OfferSpec['servicePricingRefs']>[number];
type ChargeType = NonNullable<OfferSpec['chargeTypes']>[number];

/** How far ahead billing lets a contract start (its MaxContractLeadTime). */
export const MAX_CONTRACT_LEAD_DAYS = 366;

/**
 * Set by openmeter-provider once the account is on its contract. From then
 * on a change of Offer amends the contract, from the next billing date.
 */
export const CONTRACT_STARTED_ANNOTATION = 'openmeter.miloapis.com/contractStartedAt';

/**
 * Labels on the Offers and ServicePricings the staff portal creates for a
 * contract: the account (and its organization) they're for. Such resources
 * are one customer's, so the catalog lists leave them out.
 */
export const CONTRACT_BILLING_ACCOUNT_LABEL = 'billing.miloapis.com/contract-billing-account';
export const CONTRACT_ORGANIZATION_LABEL = 'billing.miloapis.com/contract-organization';

/** Names of contract resources start with this, labelled or not. */
const CONTRACT_NAME_PREFIX = 'contract-';

/** Whether an Offer or ServicePricing was made for one account's contract. */
export const isContractResource = (resource: {
  metadata?: { name?: string; labels?: Record<string, string> };
}) =>
  Boolean(resource.metadata?.labels?.[CONTRACT_BILLING_ACCOUNT_LABEL]) ||
  (resource.metadata?.name ?? '').startsWith(CONTRACT_NAME_PREFIX);

/** Set by openmeter-provider while an amendment waits for the next billing date. */
export const OFFER_CHANGE_AT_ANNOTATION = 'openmeter.miloapis.com/offerChangeAt';

const SUBSCRIPTION_CONDITION = 'OpenMeterSubscriptionSynced';
const OFFER_CHANGE_SCHEDULED = 'OfferChangeScheduled';

/** Midnight UTC on the calendar day picked, whatever the browser's zone. */
export const contractStartFromDate = (date: Date): Date =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

/**
 * The calendar day a UTC date falls on, as a local date, for date pickers,
 * which work in the browser's zone. The inverse of contractStartFromDate.
 */
export const localDateForUtcDay = (date: Date): Date =>
  new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

/** Midnight UTC today. */
export const startOfUtcDay = (now: Date): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

/**
 * Why billing would refuse a contract starting then, or null. It must be
 * today or later and no more than a year ahead; startsAt is midnight UTC.
 */
export const contractStartProblem = (startsAt: Date, now: Date): 'past' | 'too-far' | null => {
  if (startsAt < startOfUtcDay(now)) return 'past';
  if (startsAt.getTime() > now.getTime() + MAX_CONTRACT_LEAD_DAYS * 24 * 60 * 60 * 1000) {
    return 'too-far';
  }
  return null;
};

export interface ContractState {
  startsAt: Date;
  /** The contract has started, so a change of fees amends it. */
  started: boolean;
  /** When an amendment takes effect, while one is waiting. */
  changeAt?: Date;
}

/** The entitlement's contract, or null when it has none. */
export const getContractState = (
  entitlement: ComMiloapisBillingV1Alpha1BillingEntitlement | null | undefined,
  now: Date
): ContractState | null => {
  const raw = entitlement?.spec?.contract?.startsAt;
  if (!raw) return null;
  const startsAt = new Date(raw);
  const annotations = entitlement?.metadata?.annotations ?? {};
  const condition = entitlement?.status?.conditions?.find((c) => c.type === SUBSCRIPTION_CONDITION);
  const changeAtRaw = annotations[OFFER_CHANGE_AT_ANNOTATION];
  const changeAt =
    changeAtRaw && condition?.reason === OFFER_CHANGE_SCHEDULED ? new Date(changeAtRaw) : undefined;
  return {
    startsAt,
    started: Boolean(annotations[CONTRACT_STARTED_ANNOTATION]) || startsAt <= now,
    changeAt: changeAt && !Number.isNaN(changeAt.getTime()) ? changeAt : undefined,
  };
};

export interface ContractFee {
  name: string;
  label: string;
  chargeType: 'OneTime' | 'Recurring';
  /** The unit amount: the fee charged is amount × quantity. */
  amount: number;
  /** How many of the fee the contract charges, 1 unless the Offer says. */
  quantity: number;
  /** What the amount is per (e.g. "port"), when the fee has a unit. */
  pricingUnit?: string;
  /** The service the fee is for, when it's for one. */
  serviceRef?: string;
}

/** An offer's fixed fees, setup fee first, from its pricing snapshots. */
export const getContractFees = (
  offer: ComMiloapisBillingV1Alpha1Offer | null | undefined
): ContractFee[] =>
  (offer?.spec?.servicePricings ?? [])
    .flatMap((snapshot): ContractFee[] => {
      const spec = snapshot.spec;
      if (spec?.chargeType !== 'OneTime' && spec?.chargeType !== 'Recurring') return [];
      const amount = Number.parseFloat(spec.amount ?? '');
      if (Number.isNaN(amount)) return [];
      return [
        {
          name: snapshot.name,
          label: spec.displayName || snapshot.name,
          chargeType: spec.chargeType,
          amount,
          quantity: snapshot.quantity && snapshot.quantity > 0 ? snapshot.quantity : 1,
          pricingUnit: spec.pricingUnit || undefined,
          serviceRef: spec.serviceRef || undefined,
        },
      ];
    })
    .sort((a, b) => (a.chargeType === b.chargeType ? 0 : a.chargeType === 'OneTime' ? -1 : 1));

/** Whether an offer bills usage as well as its fixed fees. */
export const offerBillsUsage = (offer: ComMiloapisBillingV1Alpha1Offer | null | undefined) =>
  (offer?.spec?.chargeTypes ?? []).includes('Usage');

/**
 * The refs of an offer's Usage pricings, with their per-service discounts,
 * for a contract that bills standard usage too.
 */
export const getUsagePricingRefs = (
  offer: ComMiloapisBillingV1Alpha1Offer | null | undefined
): ServicePricingRef[] => {
  const usage = new Set(
    (offer?.spec?.servicePricings ?? [])
      .filter((snapshot) => snapshot.spec?.chargeType === 'Usage')
      .map((snapshot) => snapshot.name)
  );
  return (offer?.spec?.servicePricingRefs ?? []).filter((ref) => usage.has(ref.name));
};

const slug = (value: string, max: number) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');

/** Most fees one contract can have, which keeps its pricing names short. */
export const MAX_CONTRACT_FEES = 20;

/**
 * Names for a contract's Offer, its fee pricings (`fee(0)` is the first
 * fee's) and the customer's own usage pricings (`usage(0)`). The timestamp
 * keeps them unique: pricings are immutable, so every change of fees gets
 * new ones, and an amendment gets a new Offer.
 */
export const contractResourceNames = (accountName: string, now: Date) => {
  const stamp = now.toISOString().replace(/\D/g, '').slice(0, 14);
  const offer = `${CONTRACT_NAME_PREFIX}${slug(accountName, 30) || 'account'}-${stamp}`;
  return {
    offer,
    fee: (index: number) => `${offer}-fee-${index + 1}`,
    usage: (index: number) => `${offer}-usage-${index + 1}`,
  };
};

export interface ContractOfferPlan {
  chargeTypes: ChargeType[];
  servicePricingRefs: ServicePricingRef[];
}

/** The charge types and pricing refs of a contract's Offer. */
export const contractOfferPlan = ({
  namespace,
  fees,
  usageRefs,
}: {
  namespace: string;
  /** The contract's fee pricings, in the order staff listed them. */
  fees: { name: string; chargeType: ContractFee['chargeType']; quantity?: number }[];
  usageRefs: ServicePricingRef[];
}): ContractOfferPlan => {
  const present = new Set<ChargeType>(fees.map((fee) => fee.chargeType));
  if (usageRefs.length > 0) present.add('Usage');
  return {
    chargeTypes: (['OneTime', 'Recurring', 'Usage'] as const).filter((type) => present.has(type)),
    servicePricingRefs: [
      ...fees.map((fee) => ({
        name: fee.name,
        namespace,
        ...(fee.quantity && fee.quantity > 1 ? { quantity: fee.quantity } : {}),
      })),
      ...usageRefs,
    ],
  };
};

/** Round to cents, as billing does. */
const cents = (amount: number) => Math.round(amount * 100) / 100;

/** Format an amount as the decimal string pricings carry, e.g. "1500.00". */
export const toPricingAmount = (amount: number) => cents(amount).toFixed(2);

/** Parse a staff-entered amount ("1,500.00", "$1500"), or NaN. */
export const parseAmount = (value: string | undefined): number => {
  const cleaned = (value ?? '').replace(/[\s,$£€]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return Number.NaN;
  return Number.parseFloat(cleaned);
};

type FeeAmount = {
  chargeType: ContractFee['chargeType'];
  /** The unit amount. */
  amount: number;
  /** How many of the fee are charged; 1 when unset. */
  quantity?: number;
};

/** What a fee charges: its amount times its quantity, in cents. */
export const feeTotal = (fee: FeeAmount) =>
  cents(fee.amount * (fee.quantity && fee.quantity > 0 ? fee.quantity : 1));

const sumFees = (fees: FeeAmount[], keep: (fee: FeeAmount) => boolean) =>
  cents(
    fees
      .filter((fee) => keep(fee) && !Number.isNaN(fee.amount))
      .reduce((a, f) => a + feeTotal(f), 0)
  );

/** What the contract charges each month: its monthly fees. */
export const monthlyTotal = (fees: FeeAmount[]) =>
  sumFees(fees, (fee) => fee.chargeType === 'Recurring');

/**
 * The contract's first invoice: its one-time fees and the first month of
 * its monthly ones, all charged in advance on the start date.
 */
export const firstInvoiceTotal = (fees: FeeAmount[]) => sumFees(fees, () => true);

/**
 * When a contract's first billing period ends: a month after it starts, or
 * the last day of a shorter month (a contract starting on 31 January's
 * first period ends on 28 or 29 February).
 */
export const firstPeriodEnd = (startsAt: Date): Date => {
  const year = startsAt.getUTCFullYear();
  const month = startsAt.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(startsAt.getUTCDate(), lastDay)));
};

/**
 * How much of the first month a contract's monthly fees are charged for
 * when the account starts on them at a given moment. OpenMeter prorates a
 * flat fee from when the subscription starts, and can't start it in the
 * past, so a contract set up on the day it starts gets a part month; one
 * set up ahead starts at midnight and gets a full one.
 */
export const firstMonthShare = (startsAt: Date, subscribedAt: Date): number => {
  const end = firstPeriodEnd(startsAt).getTime();
  const from = Math.max(startsAt.getTime(), subscribedAt.getTime());
  return Math.min(1, Math.max(0, (end - from) / (end - startsAt.getTime())));
};

/** The first invoice with its monthly fees prorated by share, fee by fee. */
export const proratedFirstInvoiceTotal = (fees: FeeAmount[], share: number) =>
  cents(
    fees
      .filter((fee) => !Number.isNaN(fee.amount))
      .reduce(
        (total, fee) =>
          total + (fee.chargeType === 'Recurring' ? cents(feeTotal(fee) * share) : feeTotal(fee)),
        0
      )
  );

/**
 * The invoice a contract's first charges went on: the account's first
 * invoice since the contract started with something to pay. Moving an
 * existing account onto a contract also invoices the old subscription's
 * last usage, usually at zero, which this passes over.
 */
export const getContractFirstInvoice = (
  invoices: ComMiloapisBillingV1Alpha1Invoice[],
  startsAt: Date
): ComMiloapisBillingV1Alpha1Invoice | undefined =>
  invoices
    .filter((invoice) => {
      const created = new Date(invoice.metadata?.creationTimestamp ?? '');
      return created >= startsAt && Number.parseFloat(invoice.status?.total ?? '0') > 0;
    })
    .sort((a, b) =>
      (a.metadata?.creationTimestamp ?? '').localeCompare(b.metadata?.creationTimestamp ?? '')
    )[0];

/** The day of the month a contract bills on, from its UTC start date. */
export const contractBillingDay = (startsAt: Date) => startsAt.getUTCDate();
