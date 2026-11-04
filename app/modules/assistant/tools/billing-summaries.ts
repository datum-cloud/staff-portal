import {
  getAmountOwed,
  getDaysOverdue,
  isPastDueInvoice,
  summarizeInvoices,
} from '@/features/billing/lib/invoice-summary';
import { getArrangementPhase, getArrangementStart } from '@/features/billing/lib/payment-terms';
import {
  getApplicationPhase,
  type BillingArrangementApplication,
} from '@/features/billing/lib/payment-terms-applications';
import {
  describeServicePricingRates,
  formatChargeTypes,
  getOfferDisplayName,
  snapshotAsPricing,
  type BillingAccount,
  type BillingEntitlement,
  type Invoice,
} from '@/features/billing/utils';
import type { OrgUsageDashboardData } from '@/modules/billing/usage.types';
import { billingAccountRoutes, offerRoutes } from '@/utils/config/routes.config';
import type {
  ComMiloapisBillingV1Alpha1BillingArrangement,
  ComMiloapisBillingV1Alpha1Offer,
} from '@openapi/billing.miloapis.com/v1alpha1';

/**
 * What the assistant's billing tools return, trimmed to what an operator
 * asks about. Pure, so the shapes are tested without the API.
 */

type Condition = { type: string; status: string; reason?: string; message?: string };

const findCondition = (conditions: Condition[] | undefined, type: string) => {
  const condition = conditions?.find((c) => c.type === type);
  return condition
    ? { status: condition.status, reason: condition.reason ?? '', message: condition.message ?? '' }
    : null;
};

/**
 * Whether the account can pay and whether its invoices are paid, from the
 * conditions billing sets, plus the payment terms in effect.
 */
export function summarizeAccountStanding(account: BillingAccount) {
  const conditions = account.status?.conditions as Condition[] | undefined;
  const arrangement = account.status?.paymentArrangement;
  return {
    // PaymentReady: a usable card, or active invoice terms.
    payment: findCondition(conditions, 'PaymentReady'),
    // InvoicingReady: False with reason PastDue once the newest invoice is overdue.
    invoicing: findCondition(conditions, 'InvoicingReady'),
    paymentTerms: arrangement
      ? {
          type: arrangement.type,
          netDays: arrangement.invoice?.netDays ?? 30,
          creditLimit: arrangement.invoice?.creditLimit ?? null,
          startsAt: arrangement.startsAt ?? null,
          endsAt: arrangement.endsAt ?? null,
        }
      : null,
  };
}

/** One invoice, with what's owed and how overdue it is. */
export function summarizeInvoice(invoice: Invoice, now: Date) {
  const pastDue = isPastDueInvoice(invoice);
  return {
    name: invoice.metadata?.name ?? '',
    billingAccountName: invoice.spec?.billingAccountRef?.name ?? '',
    phase: invoice.status?.phase ?? 'Open',
    currency: invoice.status?.currencyCode ?? 'USD',
    total: invoice.status?.total ?? null,
    amountDue: getAmountOwed(invoice),
    periodStart: invoice.spec?.period?.start ?? null,
    periodEnd: invoice.spec?.period?.end ?? null,
    dueDate: invoice.status?.dueDate ?? null,
    paidAt: invoice.status?.paidAt ?? null,
    daysOverdue: pastDue ? getDaysOverdue(invoice, now) : 0,
    // Stripe's hosted invoice page; links expire, so they're re-read often.
    documentUrl: invoice.status?.documentUri ?? null,
  };
}

/** Totals across invoices: outstanding, past due, and how old the debt is. */
export function summarizeInvoiceTotals(invoices: Invoice[], now: Date) {
  return { invoiceCount: invoices.length, ...summarizeInvoices(invoices, now) };
}

/** One payment terms arrangement, in effect, scheduled or ended. */
export function summarizeArrangement(
  arrangement: ComMiloapisBillingV1Alpha1BillingArrangement,
  now: Date
) {
  const invoice = arrangement.spec?.invoice;
  return {
    name: arrangement.metadata?.name ?? '',
    phase: getArrangementPhase(arrangement, now),
    type: arrangement.spec?.type ?? 'Invoice',
    netDays: invoice?.netDays ?? 30,
    creditLimit: invoice?.creditLimit ?? null,
    accountsPayableEmail: invoice?.accountsPayableEmail ?? null,
    purchaseOrderNumber: invoice?.purchaseOrderNumber ?? null,
    agreementReference: invoice?.agreementReference ?? null,
    startsAt: getArrangementStart(arrangement) ?? null,
    endsAt: arrangement.spec?.endsAt ?? null,
    // Staff-only context; never repeat it to the customer.
    reason: arrangement.spec?.reason ?? null,
  };
}

/** One payment terms application, as staff review it. */
export function summarizeApplication(application: BillingArrangementApplication, orgName: string) {
  const name = application.metadata?.name ?? '';
  const spec = application.spec;
  return {
    name,
    orgName,
    billingAccountName: spec?.billingAccountRef?.name ?? '',
    phase: getApplicationPhase(application),
    paymentOption: spec?.paymentOption ?? null,
    legalName: spec?.organization?.legalName ?? null,
    organizationType: spec?.organization?.type ?? null,
    website: spec?.organization?.website ?? null,
    estimatedMonthlySpend: spec?.invoice?.estimatedMonthlySpend ?? null,
    submittedAt: application.metadata?.creationTimestamp ?? null,
    decidedAt: application.status?.decidedAt ?? null,
    url: billingAccountRoutes.applications.detail(orgName, name),
  };
}

/** Set by openmeter-provider: when a contract's offer change takes effect. */
const OFFER_CHANGE_AT_ANNOTATION = 'openmeter.miloapis.com/offerChangeAt';

/** The account's offer and, for a negotiated contract, its dates. */
export function summarizeEntitlement(
  entitlement: BillingEntitlement | undefined,
  offer: ComMiloapisBillingV1Alpha1Offer | null,
  now: Date
) {
  if (!entitlement) return null;
  const offerName = entitlement.spec?.offerRef?.name ?? '';
  // spec.contract is newer than this client's generated types.
  const startsAt = (entitlement.spec as { contract?: { startsAt?: string } } | undefined)?.contract
    ?.startsAt;
  const changeAt = entitlement.metadata?.annotations?.[OFFER_CHANGE_AT_ANNOTATION];
  return {
    offerName,
    offerDisplayName: offer ? getOfferDisplayName(offer) : offerName,
    offerUrl: offerName ? offerRoutes.detail(offerName) : null,
    contract: startsAt
      ? {
          startsAt,
          started: Date.parse(startsAt) <= now.getTime(),
          // Monthly fees bill on this day of the month.
          billingDay: new Date(startsAt).getUTCDate(),
          // An amendment waiting for the next billing date.
          offerChangeAt: changeAt ?? null,
        }
      : null,
  };
}

/** Most prices listed per offer before the rest are counted. */
const MAX_OFFER_PRICES = 25;

/** An offer and what it charges, from its pricing snapshots. */
export function summarizeOffer(
  offer: ComMiloapisBillingV1Alpha1Offer,
  defaultOfferName: string,
  { withPrices = false } = {}
) {
  const name = offer.metadata?.name ?? '';
  const snapshots = offer.spec?.servicePricings ?? [];
  const summary = {
    name,
    displayName: getOfferDisplayName(offer),
    launchStage: offer.spec?.launchStage ?? 'Draft',
    chargeTypes: formatChargeTypes(offer.spec?.chargeTypes ?? []),
    isDefault: name !== '' && name === defaultOfferName,
    discountPercent: offer.spec?.discount?.percentage ?? null,
    priceCount: snapshots.length,
    url: offerRoutes.detail(name),
  };
  if (!withPrices) return summary;
  return {
    ...summary,
    prices: snapshots.slice(0, MAX_OFFER_PRICES).map((snapshot) => ({
      name: snapshot.spec?.displayName || snapshot.name,
      chargeType: snapshot.spec?.chargeType,
      service: snapshot.spec?.serviceRef,
      amount: snapshot.spec?.amount ?? null,
      rates: describeServicePricingRates(snapshotAsPricing(snapshot)).map((line) =>
        line.label ? `${line.label}: ${line.prices.join(', ')}` : line.prices.join(', ')
      ),
    })),
    morePrices: Math.max(0, snapshots.length - MAX_OFFER_PRICES),
  };
}

/** Most meters listed in a usage summary, biggest spend first. */
const MAX_USAGE_METERS = 15;

/** A billing cycle's usage and spend, by meter. */
export function summarizeUsage(dashboard: OrgUsageDashboardData) {
  const { usage } = dashboard;
  const meters = usage.meters
    .filter((meter) => meter.total > 0 || (meter.spend?.amount ?? 0) > 0)
    .sort((a, b) => (b.spend?.amount ?? 0) - (a.spend?.amount ?? 0) || b.total - a.total);
  return {
    status: usage.status,
    message: usage.message ?? null,
    cycle: dashboard.selectedBillingCycle,
    cycleLabel:
      dashboard.billingCycles.find((c) => c.value === dashboard.selectedBillingCycle)?.label ??
      null,
    spend: usage.spend ?? null,
    spendError: usage.spendError ?? null,
    meters: meters.slice(0, MAX_USAGE_METERS).map((meter) => ({
      label: meter.label,
      service: meter.groupTitle ?? null,
      total: meter.total,
      unit: meter.unit ?? null,
      spend: meter.spend ?? null,
    })),
    moreMeters: Math.max(0, meters.length - MAX_USAGE_METERS),
  };
}
