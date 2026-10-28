import {
  DEFAULT_NET_DAYS,
  type BillingArrangement,
  type PaymentTermsFormValues,
} from './payment-terms';
import type {
  ComMiloapisBillingV1Alpha1BillingArrangementApplication,
  ComMiloapisBillingV1Alpha1BillingArrangementDecline,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { z } from 'zod';

/**
 * A customer's application for payment terms (milo-os/billing
 * BillingArrangementApplication). Staff approve it by granting terms with a
 * BillingArrangement that names it in spec.applicationRef, or decline it
 * with a BillingArrangementDecline.
 */
export type BillingArrangementApplication = ComMiloapisBillingV1Alpha1BillingArrangementApplication;
export type BillingArrangementApplicationSpec = NonNullable<BillingArrangementApplication['spec']>;
export type BillingArrangementDecline = ComMiloapisBillingV1Alpha1BillingArrangementDecline;
export type BillingArrangementDeclineSpec = NonNullable<BillingArrangementDecline['spec']>;

export type ApplicationPhase = 'Pending' | 'Approved' | 'Declined' | 'Withdrawn';
export type ApplicationPaymentOption = BillingArrangementApplicationSpec['paymentOption'];
export type ApplicantOrganizationType = BillingArrangementApplicationSpec['organization']['type'];
export type EstimatedMonthlySpend = NonNullable<
  BillingArrangementApplicationSpec['invoice']
>['estimatedMonthlySpend'];

export const APPLICATION_PHASES: ApplicationPhase[] = [
  'Pending',
  'Approved',
  'Declined',
  'Withdrawn',
];

export const MAX_DECLINE_MESSAGE_LENGTH = 2000;
export const MAX_DECLINE_NOTES_LENGTH = 4000;

/**
 * Where the application sits in review. Billing's controller sets
 * status.phase; until it has reconciled a new application, read it from
 * spec.withdrawn.
 */
export function getApplicationPhase(application: BillingArrangementApplication): ApplicationPhase {
  const phase = application.status?.phase;
  if (phase) return phase;
  return application.spec?.withdrawn ? 'Withdrawn' : 'Pending';
}

/** The organization an application belongs to, from its namespace. */
export function getApplicationOrgName(application: BillingArrangementApplication): string {
  const namespace = application.metadata?.namespace ?? '';
  return namespace.startsWith('organization-') ? namespace.slice('organization-'.length) : '';
}

/** Applications for one billing account, newest first. */
export function getApplicationsForAccount(
  applications: BillingArrangementApplication[],
  accountName: string
): BillingArrangementApplication[] {
  return applications
    .filter((application) => application.spec?.billingAccountRef?.name === accountName)
    .sort(
      (a, b) =>
        Date.parse(b.metadata?.creationTimestamp ?? '') -
          Date.parse(a.metadata?.creationTimestamp ?? '') ||
        (b.metadata?.name ?? '').localeCompare(a.metadata?.name ?? '')
    );
}

const submittedAt = (application: BillingArrangementApplication) =>
  Date.parse(application.metadata?.creationTimestamp ?? '') || 0;

/**
 * The review queue's order: applications waiting for a decision come first,
 * oldest first so the longest wait is at the top. Decided and withdrawn ones
 * follow, newest first.
 */
export function sortApplicationQueue<T extends BillingArrangementApplication>(
  applications: T[]
): T[] {
  return [...applications].sort((a, b) => {
    const aPending = getApplicationPhase(a) === 'Pending';
    const bPending = getApplicationPhase(b) === 'Pending';
    if (aPending !== bPending) return aPending ? -1 : 1;
    return aPending ? submittedAt(a) - submittedAt(b) : submittedAt(b) - submittedAt(a);
  });
}

/** The decline recorded for an application, if staff declined it. */
export function getDeclineForApplication(
  declines: BillingArrangementDecline[],
  applicationName: string
): BillingArrangementDecline | undefined {
  return declines.find((decline) => decline.spec?.applicationRef?.name === applicationName);
}

/**
 * The terms that approved an application: the one its status names, or,
 * until billing's controller has reconciled the approval, the one whose
 * spec.applicationRef names it.
 */
export function getArrangementForApplication(
  arrangements: BillingArrangement[],
  application: BillingArrangementApplication
): BillingArrangement | undefined {
  const arrangementName = application.status?.arrangementRef?.name;
  const applicationName = application.metadata?.name;
  return (
    (arrangementName
      ? arrangements.find((arrangement) => arrangement.metadata?.name === arrangementName)
      : undefined) ??
    arrangements.find((arrangement) => arrangement.spec?.applicationRef?.name === applicationName)
  );
}

/** Each spend band's range, in the billing account's currency. */
const SPEND_BANDS: Record<EstimatedMonthlySpend, { from?: number; to?: number }> = {
  Under500: { to: 500 },
  From500To2500: { from: 500, to: 2500 },
  From2500To10000: { from: 2500, to: 10000 },
  Over10000: { from: 10000 },
  NotSure: {},
};

function formatAmount(amount: number, currency: string, locale: string): string {
  if (currency) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      // An unknown currency code falls through to a plain number.
    }
  }
  return new Intl.NumberFormat(locale).format(amount);
}

/**
 * The applicant's estimate as an amount range in the UI's locale, such as
 * "$2,500–$10,000", or undefined for "not sure".
 */
export function formatSpendBand(
  band: EstimatedMonthlySpend,
  currency: string,
  locale = 'en-US'
): string | undefined {
  const { from, to } = SPEND_BANDS[band];
  const amount = (value: number) => formatAmount(value, currency, locale);
  if (from !== undefined && to !== undefined) return `${amount(from)}–${amount(to)}`;
  if (to !== undefined) return `< ${amount(to)}`;
  if (from !== undefined) return `${amount(from)}+`;
  return undefined;
}

/**
 * The applicant's website as a link target. Billing accepts any string, so
 * only an absolute http(s) URL is linked: "acme.com" would otherwise become a
 * relative link into the staff portal.
 */
export function getWebsiteHref(website: string | undefined): string | undefined {
  if (!website) return undefined;
  try {
    const url = new URL(website);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Starting values for the approval form: the invoice details the customer
 * gave, our standard net days, and the credit limit and reason left for the
 * reviewer to fill in. A renewal passes `startsAt`, when the current terms
 * end, so the new terms don't overlap them.
 */
export function paymentTermsFormFromApplication(
  application: BillingArrangementApplication,
  options: { startsAt?: Date } = {}
): PaymentTermsFormValues {
  const invoice = application.spec?.invoice;
  return {
    netDays: DEFAULT_NET_DAYS,
    creditLimit: '',
    accountsPayableEmail: invoice?.accountsPayableEmail ?? '',
    purchaseOrderNumber: invoice?.purchaseOrderNumber ?? '',
    agreementReference: invoice?.agreementReference ?? '',
    startsAt: options.startsAt,
    endsAt: undefined,
    reason: '',
  };
}

export const declineApplicationFormSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Tell the customer why, and what they can do next')
    .max(MAX_DECLINE_MESSAGE_LENGTH, `Must be ${MAX_DECLINE_MESSAGE_LENGTH} characters or fewer`),
  internalNotes: z
    .string()
    .trim()
    .max(MAX_DECLINE_NOTES_LENGTH, `Must be ${MAX_DECLINE_NOTES_LENGTH} characters or fewer`)
    .or(z.literal(''))
    .optional(),
});

export type DeclineApplicationFormValues = z.infer<typeof declineApplicationFormSchema>;

export const emptyDeclineApplicationForm: DeclineApplicationFormValues = {
  message: '',
  internalNotes: '',
};

export function buildDeclineSpec(
  values: DeclineApplicationFormValues,
  applicationName: string
): BillingArrangementDeclineSpec {
  return {
    applicationRef: { name: applicationName },
    message: values.message.trim(),
    internalNotes: values.internalNotes?.trim() || undefined,
  };
}
