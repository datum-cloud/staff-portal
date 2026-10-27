import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1BillingArrangement,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { z } from 'zod';

/**
 * Payment terms staff grant to a billing account so it can be billed by
 * invoice instead of by card (milo-os/billing BillingArrangement). Only
 * staff can create or change these; customers see the active terms on the
 * billing account.
 */
export type BillingArrangement = ComMiloapisBillingV1Alpha1BillingArrangement;
export type BillingArrangementSpec = NonNullable<BillingArrangement['spec']>;
export type BillingArrangementPhase = 'Scheduled' | 'Active' | 'Ended';

/** Standard net days, matching the billing API default. */
export const DEFAULT_NET_DAYS = 30;
export const MAX_NET_DAYS = 90;
export const MAX_REASON_LENGTH = 1024;

/**
 * When an arrangement takes effect: spec.startsAt, or its creation time
 * when the billing webhook hasn't defaulted it yet.
 */
export function getArrangementStart(arrangement: BillingArrangement): string | undefined {
  return arrangement.spec?.startsAt ?? arrangement.metadata?.creationTimestamp;
}

/**
 * Phase of an arrangement at `now`, mirroring the billing controller: active
 * from startsAt up to, not including, endsAt. Computed here rather than read
 * from status so the page is right immediately after a change, before the
 * controller has reconciled.
 */
export function getArrangementPhase(
  arrangement: BillingArrangement,
  now: Date = new Date()
): BillingArrangementPhase {
  const endsAt = arrangement.spec?.endsAt;
  if (endsAt && now.getTime() >= Date.parse(endsAt)) return 'Ended';
  const start = getArrangementStart(arrangement);
  if (start && now.getTime() < Date.parse(start)) return 'Scheduled';
  return 'Active';
}

/** Arrangements for one billing account, newest start first. */
export function getArrangementsForAccount(
  arrangements: BillingArrangement[],
  accountName: string
): BillingArrangement[] {
  return arrangements
    .filter((arrangement) => arrangement.spec?.billingAccountRef?.name === accountName)
    .sort(
      (a, b) =>
        Date.parse(getArrangementStart(b) ?? '') - Date.parse(getArrangementStart(a) ?? '') ||
        (b.metadata?.name ?? '').localeCompare(a.metadata?.name ?? '')
    );
}

/**
 * The arrangement staff can act on: the one in effect, otherwise the next
 * scheduled one. Arrangements for an account never overlap, so there is at
 * most one of each.
 */
export function getCurrentArrangement(
  arrangements: BillingArrangement[],
  now: Date = new Date()
): BillingArrangement | undefined {
  const active = arrangements.find((a) => getArrangementPhase(a, now) === 'Active');
  if (active) return active;
  return [...arrangements]
    .filter((a) => getArrangementPhase(a, now) === 'Scheduled')
    .sort(
      (a, b) => Date.parse(getArrangementStart(a) ?? '') - Date.parse(getArrangementStart(b) ?? '')
    )[0];
}

/** The billing account's PaymentReady condition: card or active terms. */
export function getPaymentReadyCondition(account: ComMiloapisBillingV1Alpha1BillingAccount) {
  return account.status?.conditions?.find((condition) => condition.type === 'PaymentReady');
}

/** How the account is billed, from billing's PaymentReady condition. */
export type BillingStatus =
  | 'invoice'
  | 'card'
  | 'terms-scheduled'
  | 'terms-ended'
  | 'card-failing'
  | 'not-set-up'
  | 'unknown';

/**
 * Collapse PaymentReady into the few states staff care about. Reasons come
 * from the billing controller; any unrecognised False reason is treated as
 * "not set up" rather than shown raw.
 */
export function getBillingStatus(
  condition: ReturnType<typeof getPaymentReadyCondition>
): BillingStatus {
  if (!condition || condition.status === 'Unknown') return 'unknown';
  if (condition.status === 'True') {
    return condition.reason === 'InvoiceTerms' ? 'invoice' : 'card';
  }
  switch (condition.reason) {
    case 'ArrangementScheduled':
      return 'terms-scheduled';
    case 'ArrangementEnded':
      return 'terms-ended';
    case 'PaymentMethodDegraded':
    case 'PaymentMethodNotFound':
      return 'card-failing';
    default:
      return 'not-set-up';
  }
}

const positiveDecimal = /^(0|[1-9]\d*)(\.\d+)?$/;

// Optional fields end in .optional(): datum-ui's Form.Field marks a field
// required unless its outermost schema type is optional, nullable or default.

/**
 * An optional date that a cleared picker can leave as '' or null. Both mean
 * "no date". Without this, z.coerce.date() turns null into 1 January 1970,
 * and clearing the end date of active terms would end them immediately.
 */
const optionalDate = z
  .preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce.date().optional()
  )
  .optional();

const optionalText = (max: number) =>
  z.string().trim().max(max, `Must be ${max} characters or fewer`).or(z.literal('')).optional();

export const paymentTermsFormSchema = z
  .object({
    netDays: z.coerce
      .number()
      .int('Net days must be a whole number')
      .min(1, 'Net days must be at least 1')
      .max(MAX_NET_DAYS, `Net days must be ${MAX_NET_DAYS} or fewer`),
    creditLimit: z
      .string()
      .trim()
      .regex(positiveDecimal, 'Enter an amount such as 10000 or 2500.50')
      .refine((value) => Number(value) > 0, 'Credit limit must be greater than 0'),
    accountsPayableEmail: z
      .string()
      .trim()
      .email('Enter a valid email address')
      .max(254)
      .or(z.literal(''))
      .optional(),
    purchaseOrderNumber: optionalText(64),
    agreementReference: optionalText(128),
    startsAt: optionalDate,
    endsAt: optionalDate,
    reason: z
      .string()
      .trim()
      .min(1, 'Record why these terms are being granted')
      .max(MAX_REASON_LENGTH, `Must be ${MAX_REASON_LENGTH} characters or fewer`),
  })
  .refine((values) => !values.startsAt || !values.endsAt || values.endsAt > values.startsAt, {
    message: 'End date must be after the start date',
    path: ['endsAt'],
  });

export type PaymentTermsFormValues = z.infer<typeof paymentTermsFormSchema>;

export const emptyPaymentTermsForm: PaymentTermsFormValues = {
  netDays: DEFAULT_NET_DAYS,
  creditLimit: '',
  accountsPayableEmail: '',
  purchaseOrderNumber: '',
  agreementReference: '',
  startsAt: undefined,
  endsAt: undefined,
  reason: '',
};

/** Form values for changing an existing arrangement. */
export function paymentTermsFormFromArrangement(
  arrangement: BillingArrangement
): PaymentTermsFormValues {
  const spec = arrangement.spec;
  return {
    netDays: spec?.invoice?.netDays ?? DEFAULT_NET_DAYS,
    creditLimit: spec?.invoice?.creditLimit ?? '',
    accountsPayableEmail: spec?.invoice?.accountsPayableEmail ?? '',
    purchaseOrderNumber: spec?.invoice?.purchaseOrderNumber ?? '',
    agreementReference: spec?.invoice?.agreementReference ?? '',
    startsAt: spec?.startsAt ? new Date(spec.startsAt) : undefined,
    endsAt: spec?.endsAt ? new Date(spec.endsAt) : undefined,
    reason: spec?.reason ?? '',
  };
}

const textOrUndefined = (value: string | undefined) => value?.trim() || undefined;

/**
 * Spec for a new Invoice arrangement. An unset start is left for the billing
 * webhook, which defaults it to the time the arrangement is created. Naming
 * an application approves it.
 */
export function buildArrangementSpec(
  values: PaymentTermsFormValues,
  accountName: string,
  options: { applicationName?: string } = {}
): BillingArrangementSpec {
  return {
    billingAccountRef: { name: accountName },
    type: 'Invoice',
    ...(options.applicationName ? { applicationRef: { name: options.applicationName } } : {}),
    invoice: {
      netDays: values.netDays,
      creditLimit: values.creditLimit.trim(),
      accountsPayableEmail: textOrUndefined(values.accountsPayableEmail),
      purchaseOrderNumber: textOrUndefined(values.purchaseOrderNumber),
      agreementReference: textOrUndefined(values.agreementReference),
    },
    ...(values.startsAt ? { startsAt: values.startsAt.toISOString() } : {}),
    ...(values.endsAt ? { endsAt: values.endsAt.toISOString() } : {}),
    reason: values.reason.trim(),
  };
}

/** Merge patch value: null removes the field, a value sets it. */
type Patchable<T> = { [K in keyof T]?: T[K] | null };

export type ArrangementMergePatch = {
  spec: Patchable<Omit<BillingArrangementSpec, 'invoice' | 'billingAccountRef' | 'type'>> & {
    invoice?: Patchable<NonNullable<BillingArrangementSpec['invoice']>>;
  };
};

/**
 * JSON merge patch that changes an arrangement's terms. Cleared optional
 * fields are sent as null so the API removes them. billingAccountRef and
 * type are immutable and never sent. The start date can only move while the
 * arrangement is still scheduled.
 */
export function buildArrangementPatch(
  values: PaymentTermsFormValues,
  options: { canChangeStart: boolean }
): ArrangementMergePatch {
  return {
    spec: {
      invoice: {
        netDays: values.netDays,
        creditLimit: values.creditLimit.trim(),
        accountsPayableEmail: textOrUndefined(values.accountsPayableEmail) ?? null,
        purchaseOrderNumber: textOrUndefined(values.purchaseOrderNumber) ?? null,
        agreementReference: textOrUndefined(values.agreementReference) ?? null,
      },
      ...(options.canChangeStart && values.startsAt
        ? { startsAt: values.startsAt.toISOString() }
        : {}),
      endsAt: values.endsAt ? values.endsAt.toISOString() : null,
      reason: values.reason.trim(),
    },
  };
}

/**
 * Allowance for a browser clock that runs ahead of the API server. Billing
 * only accepts an endsAt before startsAt (withdrawing scheduled terms) when
 * it isn't in the server's future.
 */
export const WITHDRAW_CLOCK_SKEW_MS = 60_000;

/**
 * Merge patch that ends terms now, or withdraws scheduled terms before they
 * start. Ending keeps the arrangement as a record; deleting would lose it.
 */
export function buildEndArrangementPatch(
  phase: BillingArrangementPhase,
  now: Date = new Date()
): ArrangementMergePatch {
  const endsAt = phase === 'Scheduled' ? new Date(now.getTime() - WITHDRAW_CLOCK_SKEW_MS) : now;
  return { spec: { endsAt: endsAt.toISOString() } };
}
