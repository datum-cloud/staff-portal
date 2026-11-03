import type {
  ComMiloapisBillingV1Alpha1BillingEntitlement,
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
  amount: number;
  serviceRef: string;
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
          serviceRef: spec.serviceRef,
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

/**
 * Names for a contract's Offer and its fee pricings. The timestamp keeps
 * them unique: pricings are immutable, so every change of fees gets new
 * ones, and an amendment gets a new Offer.
 */
export const contractResourceNames = (accountName: string, now: Date) => {
  const stamp = now.toISOString().replace(/\D/g, '').slice(0, 14);
  const offer = `contract-${slug(accountName, 30) || 'account'}-${stamp}`;
  return { offer, setupFee: `${offer}-setup`, monthlyFee: `${offer}-monthly` };
};

export interface ContractOfferPlan {
  chargeTypes: ChargeType[];
  servicePricingRefs: ServicePricingRef[];
}

/** The charge types and pricing refs of a contract's Offer. */
export const contractOfferPlan = ({
  namespace,
  setupFeeName,
  monthlyFeeName,
  usageRefs,
}: {
  namespace: string;
  /** Left out when amending, or for a contract with no setup fee. */
  setupFeeName?: string;
  monthlyFeeName: string;
  usageRefs: ServicePricingRef[];
}): ContractOfferPlan => {
  const refs: ServicePricingRef[] = [];
  const chargeTypes: ChargeType[] = [];
  if (setupFeeName) {
    refs.push({ name: setupFeeName, namespace });
    chargeTypes.push('OneTime');
  }
  refs.push({ name: monthlyFeeName, namespace });
  chargeTypes.push('Recurring');
  if (usageRefs.length > 0) {
    refs.push(...usageRefs);
    chargeTypes.push('Usage');
  }
  return { chargeTypes, servicePricingRefs: refs };
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

/**
 * The contract's first invoice: the setup fee and the first month, both
 * charged in advance on the start date.
 */
export const firstInvoiceTotal = (setupFee: number, monthlyFee: number) =>
  cents((Number.isNaN(setupFee) ? 0 : setupFee) + monthlyFee);

/** The day of the month a contract bills on, from its UTC start date. */
export const contractBillingDay = (startsAt: Date) => startsAt.getUTCDate();
