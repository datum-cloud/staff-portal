import type { PaymentTermsInput } from '@/modules/billing/billing-cycle';
import type {
  ComMiloapisBillingV1Alpha1BillingEntitlement,
  ComMiloapisBillingV1Alpha1Invoice,
  ComMiloapisBillingV1Alpha1Offer,
  ComMiloapisBillingV1Alpha1ServicePricing,
} from '@openapi/billing.miloapis.com/v1alpha1';

/**
 * Contracts: a negotiated set fee, a one-time setup fee and a monthly charge,
 * billed from a start date set on the account's BillingEntitlement. See
 * milo-os/billing docs/enhancements/contract-billing.md.
 */

type OfferSpec = NonNullable<ComMiloapisBillingV1Alpha1Offer['spec']>;
type ServicePricingRef = NonNullable<OfferSpec['servicePricingRefs']>[number];
type ChargeType = NonNullable<OfferSpec['chargeTypes']>[number];

/** Contract fees are USD only, like every ServicePricing. */
export const CONTRACT_CURRENCY = 'USD';

/** How far ahead billing lets a contract start (its MaxContractLeadTime). */
export const MAX_CONTRACT_LEAD_DAYS = 366;

/** A discount as typed ("25"), as the whole percent an Offer ref takes, or undefined for none. */
export const parseDiscount = (value: string): number | undefined => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** A ref's discount as the form shows it: "25", or empty for none. */
export const discountText = (percentage?: number): string => (percentage ? String(percentage) : '');

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

/**
 * A draft contract is its Offer left at launchStage Draft, with the contract
 * labels and, for a new contract, its start date here (midnight UTC, RFC
 * 3339). It isn't on the entitlement until it's published.
 */
export const CONTRACT_STARTS_AT_ANNOTATION = 'billing.miloapis.com/contract-starts-at';

/** Whether an Offer is a draft contract, not yet published. */
export const isContractDraft = (offer: ComMiloapisBillingV1Alpha1Offer | null | undefined) =>
  Boolean(offer) &&
  offer?.spec?.launchStage === 'Draft' &&
  Boolean(offer.metadata?.labels?.[CONTRACT_BILLING_ACCOUNT_LABEL]) &&
  !offer.metadata?.deletionTimestamp;

/** A draft contract's start date, if it has a valid one. */
export const getDraftStartsAt = (
  offer: ComMiloapisBillingV1Alpha1Offer | null | undefined
): Date | undefined => {
  const raw = offer?.metadata?.annotations?.[CONTRACT_STARTS_AT_ANNOTATION];
  const date = raw ? new Date(raw) : undefined;
  return date && !Number.isNaN(date.getTime()) ? date : undefined;
};

/**
 * A draft Offer with the snapshot billing would write when it's published:
 * each ref's pricing, quantity and discount. Drafts have no snapshot of their
 * own, and the contract's fees and the editor's rows are read from it. A ref
 * whose pricing isn't in `pricings` (deleted meanwhile) is left out.
 */
export const withDraftSnapshot = (
  offer: ComMiloapisBillingV1Alpha1Offer,
  pricings: ComMiloapisBillingV1Alpha1ServicePricing[]
): ComMiloapisBillingV1Alpha1Offer => {
  const byName = new Map(pricings.map((pricing) => [pricing.metadata?.name ?? '', pricing]));
  const servicePricings = (offer.spec?.servicePricingRefs ?? []).flatMap((ref) => {
    const spec = byName.get(ref.name)?.spec;
    if (!spec) return [];
    return [
      {
        name: ref.name,
        spec,
        ...(ref.quantity ? { quantity: ref.quantity } : {}),
        ...(ref.discount ? { discount: ref.discount } : {}),
      },
    ];
  });
  return { ...offer, spec: { ...offer.spec, servicePricings } as OfferSpec };
};

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

/** Why a draft can't be published as it is, so it needs editing first. */
export type DraftPublishProblem =
  | 'no-start'
  | 'start-passed'
  | 'start-too-far'
  | 'contract-exists'
  | 'one-time-after-start';

/**
 * Whether the account's draft can be published as it is, given its
 * entitlement now: a new contract needs a start date that billing accepts,
 * and a fee change made before the contract started can't charge one-time
 * fees once it has. A draft that sets up a contract (it has a start date)
 * can't be published once the account is on one.
 */
export const draftPublishProblem = (
  draft: ComMiloapisBillingV1Alpha1Offer,
  entitlement: ComMiloapisBillingV1Alpha1BillingEntitlement | null | undefined,
  now: Date
): DraftPublishProblem | null => {
  const contract = getContractState(entitlement, now);
  if (contract) {
    if (draft.metadata?.annotations?.[CONTRACT_STARTS_AT_ANNOTATION]) return 'contract-exists';
    if (contract.started && (draft.spec?.chargeTypes ?? []).includes('OneTime')) {
      return 'one-time-after-start';
    }
    return null;
  }
  const startsAt = getDraftStartsAt(draft);
  if (!startsAt) return 'no-start';
  const problem = contractStartProblem(startsAt, now);
  return problem === 'past' ? 'start-passed' : problem === 'too-far' ? 'start-too-far' : null;
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
  /** The list fee this is the customer's own amount for, if any. */
  basedOn?: string;
  /** Percent off the fee, if the Offer gives one. */
  discount?: number;
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
          basedOn: spec.basedOn || undefined,
          discount: snapshot.discount?.percentage || undefined,
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
  fees: {
    name: string;
    chargeType: ContractFee['chargeType'];
    quantity?: number;
    discount?: number;
  }[];
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
        ...(fee.discount ? { discount: { percentage: fee.discount } } : {}),
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

/**
 * What a fee charges after its discount, as billing works it out: the
 * total less the percentage, rounded to the cent.
 */
export const discountedFeeTotal = (fee: FeeAmount & { discount?: number }) => {
  const total = feeTotal(fee);
  return fee.discount ? cents((total * (100 - fee.discount)) / 100) : total;
};

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

/**
 * The billing cycle an account is on. A contract that has started bills
 * monthly on its start day, whatever the account's payment terms say;
 * before it starts, and without one, the account's terms apply.
 */
export const billingCycleTerms = (
  terms: PaymentTermsInput | undefined,
  contract: ContractState | null | undefined
): PaymentTermsInput | undefined =>
  contract?.started
    ? { invoiceDayOfMonth: contractBillingDay(contract.startsAt), invoiceFrequency: 'Monthly' }
    : terms;
