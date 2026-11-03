import {
  getAccountCurrency,
  getCriticalFailedPaymentMethod,
  getPaymentMethodDisplayName,
  getPaymentMethodsForAccount,
  isDefaultPaymentMethod,
  type Invoice,
} from '../utils';
import {
  DAY_MS,
  getAmountOwed,
  getDaysOverdue,
  isPastDueInvoice,
  parseAmount,
  summarizeInvoices,
} from './invoice-summary';
import { getBillingStatus, getPaymentReadyCondition } from './payment-terms';
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1BillingEntitlement,
  ComMiloapisBillingV1Alpha1PaymentMethod,
} from '@openapi/billing.miloapis.com/v1alpha1';

/**
 * The billing account dashboard's attention checks. Each check is a pure
 * function of what has loaded so far: it returns its issues (an empty list
 * means it passed) or `null` while an input it needs is still loading.
 * Issues carry data rather than sentences so the banner can translate them.
 */

type BillingAccount = ComMiloapisBillingV1Alpha1BillingAccount;
type PaymentMethod = ComMiloapisBillingV1Alpha1PaymentMethod;
type BillingEntitlement = ComMiloapisBillingV1Alpha1BillingEntitlement;

/** An invoice is unusual when its total is this many times the account's median. */
export const UNUSUAL_INVOICE_FACTOR = 100;
/** Fewer other non-zero invoices than this and there is no baseline to compare with. */
export const UNUSUAL_INVOICE_MIN_HISTORY = 3;
/**
 * Open balance above which a card charge is likely to be declined, per
 * currency. Accounts in other currencies skip the check: one figure means
 * very different amounts in, say, USD and JPY.
 */
export const LARGE_CARD_BALANCE: Readonly<Record<string, number>> = {
  USD: 10_000,
  EUR: 10_000,
  GBP: 10_000,
};
/** Cards expiring within this many days get a warning. */
export const CARD_EXPIRY_WARNING_DAYS = 30;
/** Usage spend this many times last cycle's at the same point is a spike. */
export const USAGE_SPIKE_FACTOR = 5;
/** Ignore spikes from a tiny base: last cycle's spend at this point must reach this. */
export const USAGE_SPIKE_MIN_PREVIOUS = 1;

export type HealthSeverity = 'error' | 'warning' | 'info';

export type HealthCheckKey =
  | 'invoicePastDue'
  | 'invoiceUnusual'
  | 'largeCardBalance'
  | 'paymentMethod'
  | 'cardExpiry'
  | 'creditLimit'
  | 'usageSpike'
  | 'taxId'
  | 'offer';

export type HealthIssue =
  | {
      key: 'invoicePastDue';
      severity: 'error';
      invoiceName: string;
      amount: number;
      currency: string;
      daysOverdue: number;
      dueDate?: string;
    }
  | {
      key: 'invoiceUnusual';
      severity: 'warning';
      invoiceNames: string[];
      maxTotal: number;
      median: number;
      currency: string;
    }
  | {
      key: 'largeCardBalance';
      severity: 'warning';
      outstanding: number;
      unpaidCount: number;
      currency: string;
    }
  | {
      key: 'paymentMethod';
      severity: 'error';
      reason: 'failed' | 'missing';
      paymentMethodName?: string;
      failureMessage?: string;
    }
  | {
      key: 'cardExpiry';
      severity: 'error' | 'warning';
      paymentMethodName: string;
      brand?: string;
      last4?: string;
      expiresAt: string;
      expired: boolean;
    }
  | {
      key: 'creditLimit';
      severity: 'warning';
      /** Spend so far this cycle. */
      cycleSpend: number;
      creditLimit: number;
      currency: string;
    }
  | {
      key: 'usageSpike';
      severity: 'warning';
      currentSpend: number;
      previousSpend: number;
      factor: number;
      currency: string;
    }
  | { key: 'taxId'; severity: 'info'; country?: string }
  | { key: 'offer'; severity: 'warning' };

export interface UsageSpendComparison {
  /** Spend so far this cycle. */
  current: number;
  /** Spend over the previous cycle, cut at the same point. */
  previous: number;
  currency: string;
}

/** Inputs as they arrive; `undefined` means that data is still loading. */
export interface AccountHealthInputs {
  account: BillingAccount;
  invoices?: readonly Invoice[];
  paymentMethods?: readonly PaymentMethod[];
  /** `null` when loaded and the account has none. */
  entitlement?: BillingEntitlement | null;
  usage?: UsageSpendComparison;
  now: Date;
}

export interface AccountHealth {
  /** Every issue, most severe first. */
  issues: HealthIssue[];
  /** Checks that ran and found nothing. */
  passing: HealthCheckKey[];
  /** Checks waiting on data. */
  pending: HealthCheckKey[];
}

type Check = (inputs: AccountHealthInputs) => HealthIssue[] | null;

/**
 * Spend this cycle is a spike: at least USAGE_SPIKE_FACTOR × last cycle's
 * at the same point, once last cycle's reached USAGE_SPIKE_MIN_PREVIOUS.
 */
export const isUsageSpike = ({ current, previous }: UsageSpendComparison): boolean =>
  previous >= USAGE_SPIKE_MIN_PREVIOUS && current / previous >= USAGE_SPIKE_FACTOR;

/** Billed by card: no invoice terms in effect. */
const isCardBilled = (account: BillingAccount): boolean =>
  !account.status?.paymentArrangement &&
  getBillingStatus(getPaymentReadyCondition(account)) !== 'invoice';

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const checkInvoicePastDue: Check = ({ account, invoices, now }) =>
  invoices
    ? invoices.filter(isPastDueInvoice).map((invoice) => ({
        key: 'invoicePastDue',
        severity: 'error',
        invoiceName: invoice.metadata?.name ?? '',
        amount: getAmountOwed(invoice),
        currency: invoice.status?.currencyCode ?? getAccountCurrency(account),
        daysOverdue: getDaysOverdue(invoice, now),
        dueDate: invoice.status?.dueDate,
      }))
    : null;

/**
 * Invoices whose total is over UNUSUAL_INVOICE_FACTOR × the median of the
 * account's other non-zero invoices, once there are enough of them. Void
 * invoices are left out: voiding is how a bad total gets fixed.
 */
const checkInvoiceUnusual: Check = ({ account, invoices }) => {
  if (!invoices) return null;
  const withTotals = invoices
    .filter((invoice) => invoice.status?.phase !== 'Void')
    .map((invoice) => ({ invoice, total: parseAmount(invoice.status?.total) }))
    .filter(({ total }) => total > 0);

  const unusual = withTotals
    .map((entry) => {
      const others = withTotals.filter((other) => other !== entry).map(({ total }) => total);
      return {
        ...entry,
        median: others.length >= UNUSUAL_INVOICE_MIN_HISTORY ? median(others) : 0,
      };
    })
    .filter(({ total, median: m }) => m > 0 && total > m * UNUSUAL_INVOICE_FACTOR);

  if (unusual.length === 0) return [];
  return [
    {
      key: 'invoiceUnusual',
      severity: 'warning',
      invoiceNames: unusual.map(({ invoice }) => invoice.metadata?.name ?? ''),
      maxTotal: Math.max(...unusual.map(({ total }) => total)),
      median: median(withTotals.map(({ total }) => total)),
      currency: getAccountCurrency(account),
    },
  ];
};

const checkLargeCardBalance: Check = ({ account, invoices, now }) => {
  if (!invoices) return null;
  const threshold = LARGE_CARD_BALANCE[getAccountCurrency(account)];
  if (!isCardBilled(account) || threshold === undefined) return [];
  const { outstanding, unpaidCount } = summarizeInvoices(invoices, now);
  return outstanding > threshold
    ? [
        {
          key: 'largeCardBalance',
          severity: 'warning',
          outstanding,
          unpaidCount,
          currency: getAccountCurrency(account),
        },
      ]
    : [];
};

const accountMethods = (account: BillingAccount, paymentMethods: readonly PaymentMethod[]) =>
  getPaymentMethodsForAccount(
    [...paymentMethods],
    account.metadata?.name ?? '',
    account.metadata?.namespace
  );

/** The card charges land on: the default, or the only one. */
const chargedMethod = (
  account: BillingAccount,
  paymentMethods: readonly PaymentMethod[]
): PaymentMethod | undefined => {
  const methods = accountMethods(account, paymentMethods);
  return methods.find((method) => isDefaultPaymentMethod(method, account)) ?? methods[0];
};

const checkPaymentMethod: Check = ({ account, paymentMethods }) => {
  if (!paymentMethods) return null;
  if (!isCardBilled(account)) return [];
  const failed = getCriticalFailedPaymentMethod(account, [...paymentMethods]);
  if (failed) {
    return [
      {
        key: 'paymentMethod',
        severity: 'error',
        reason: 'failed',
        paymentMethodName: getPaymentMethodDisplayName(failed),
        failureMessage: failed.status?.failureMessage || failed.status?.failureReason,
      },
    ];
  }
  return accountMethods(account, paymentMethods).length === 0
    ? [{ key: 'paymentMethod', severity: 'error', reason: 'missing' }]
    : [];
};

/** Cards are valid through the last day of their expiry month. */
const cardExpiresAt = (month: number, year: number): Date => new Date(Date.UTC(year, month, 1) - 1);

const checkCardExpiry: Check = ({ account, paymentMethods, now }) => {
  if (!paymentMethods) return null;
  const method = chargedMethod(account, paymentMethods);
  const card = method?.status?.details?.card;
  if (!method || !card?.expiryMonth || !card.expiryYear) return [];

  const expiresAt = cardExpiresAt(card.expiryMonth, card.expiryYear);
  const daysLeft = (expiresAt.getTime() - now.getTime()) / DAY_MS;
  if (daysLeft > CARD_EXPIRY_WARNING_DAYS) return [];

  const expired = daysLeft < 0;
  return [
    {
      key: 'cardExpiry',
      severity: expired ? 'error' : 'warning',
      paymentMethodName: getPaymentMethodDisplayName(method),
      brand: card.brand,
      last4: card.last4,
      expiresAt: expiresAt.toISOString(),
      expired,
    },
  ];
};

/** The credit limit is the most the account should spend in one billing cycle. */
const checkCreditLimit: Check = ({ account, usage }) => {
  const limitText = account.status?.paymentArrangement?.invoice?.creditLimit;
  if (!limitText) return [];
  if (!usage) return null;
  const creditLimit = parseAmount(limitText);
  return creditLimit > 0 && usage.current > creditLimit
    ? [
        {
          key: 'creditLimit',
          severity: 'warning',
          cycleSpend: usage.current,
          creditLimit,
          currency: usage.currency,
        },
      ]
    : [];
};

const checkUsageSpike: Check = ({ usage }) => {
  if (!usage) return null;
  return isUsageSpike(usage)
    ? [
        {
          key: 'usageSpike',
          severity: 'warning',
          currentSpend: usage.current,
          previousSpend: usage.previous,
          factor: usage.current / usage.previous,
          currency: usage.currency,
        },
      ]
    : [];
};

/** A business (it has a company name) with no tax ID on file. */
const checkTaxId: Check = ({ account }) => {
  const contact = account.spec?.contactInfo;
  const isBusiness = Boolean(contact?.businessName?.trim());
  return isBusiness && !account.spec?.taxIds?.length
    ? [{ key: 'taxId', severity: 'info', country: contact?.address?.country }]
    : [];
};

const checkOffer: Check = ({ entitlement }) => {
  if (entitlement === undefined) return null;
  return entitlement?.spec?.offerRef?.name ? [] : [{ key: 'offer', severity: 'warning' }];
};

const CHECKS: ReadonlyArray<readonly [HealthCheckKey, Check]> = [
  ['invoicePastDue', checkInvoicePastDue],
  ['paymentMethod', checkPaymentMethod],
  ['cardExpiry', checkCardExpiry],
  ['invoiceUnusual', checkInvoiceUnusual],
  ['largeCardBalance', checkLargeCardBalance],
  ['creditLimit', checkCreditLimit],
  ['usageSpike', checkUsageSpike],
  ['offer', checkOffer],
  ['taxId', checkTaxId],
];

const SEVERITY_RANK: Record<HealthSeverity, number> = { error: 0, warning: 1, info: 2 };

export const getAccountHealth = (inputs: AccountHealthInputs): AccountHealth => {
  const results = CHECKS.map(([key, check]) => ({ key, issues: check(inputs) }));
  return {
    issues: results
      .flatMap(({ issues }) => issues ?? [])
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]),
    passing: results.filter(({ issues }) => issues?.length === 0).map(({ key }) => key),
    pending: results.filter(({ issues }) => issues === null).map(({ key }) => key),
  };
};
