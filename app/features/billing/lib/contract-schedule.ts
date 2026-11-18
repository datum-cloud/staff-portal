import {
  discountedFeeTotal,
  firstPeriodEnd,
  nextBillingDate,
  intervalMonths,
  type ContractFee,
  type FeeInterval,
} from './contract';

/**
 * When a contract's charges will be invoiced and fall due, worked out from
 * its fees the way the billing provider bills them:
 *
 * - a one-time fee on the contract's start date;
 * - a recurring fee billed in advance at the start of each of its periods,
 *   and one billed in arrears at the end of each;
 * - usage at the end of every month;
 *
 * all on the contract's billing day, a month, quarter or year apart, and on
 * the last day of a shorter month for the 29th to 31st. Payment is due the
 * account's net days after.
 *
 * It's an estimate: invoices can be issued a little after their date, a
 * contract set up on its start day prorates its first period, and amounts
 * are before tax and any Offer-wide discount.
 */

/** One fee's charge on an invoice, for one of its periods. */
export interface ScheduledCharge {
  name: string;
  label: string;
  chargeType: ContractFee['chargeType'];
  interval?: FeeInterval;
  /** What it charges, after its own discount. */
  total: number;
  /** The period a recurring fee is charged for. */
  period?: { from: Date; to: Date };
}

/** An invoice the contract will produce. */
export interface ScheduledInvoice {
  date: Date;
  /** When it's due, when the account has net days. */
  dueDate?: Date;
  charges: ScheduledCharge[];
  /** The fixed charges' total. */
  total: number;
  /** Whether usage is billed on it too, so the total isn't all of it. */
  billsUsage: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The contract's billing date `months` months after it starts. */
const billingDate = (startsAt: Date, months: number) => firstPeriodEnd(startsAt, months);

/**
 * The contract's invoices from its start through `months` months later,
 * each with the fixed charges on it. Months with nothing fixed are kept
 * when the contract bills usage, since usage is invoiced every month.
 */
export const contractInvoiceSchedule = ({
  startsAt,
  fees,
  billsUsage,
  netDays,
  invoiceDay,
  months = 12,
}: {
  startsAt: Date;
  fees: ContractFee[];
  billsUsage: boolean;
  netDays?: number;
  /** Set when the contract bills on the account's invoice day, not its start's. */
  invoiceDay?: number;
  months?: number;
}): ScheduledInvoice[] => {
  if (invoiceDay) {
    return invoiceDaySchedule({ startsAt, fees, billsUsage, netDays, invoiceDay, months });
  }
  const invoices: ScheduledInvoice[] = [];
  for (let k = 0; k <= months; k++) {
    const date = billingDate(startsAt, k);
    const charges: ScheduledCharge[] = fees.flatMap((fee): ScheduledCharge[] => {
      const base = {
        name: fee.name,
        label: fee.label,
        chargeType: fee.chargeType,
        interval: fee.interval,
        total: discountedFeeTotal(fee),
      };
      if (fee.chargeType === 'OneTime') return k === 0 ? [base] : [];
      const every = intervalMonths(fee.interval);
      if (k % every !== 0) return [];
      // A fee with renewals stops after its last period: one billed in
      // advance isn't charged at its end, one in arrears is, for the last.
      const last = fee.periods ? fee.periods * every : undefined;
      const inAdvance = (fee.billingTiming ?? 'InAdvance') === 'InAdvance';
      if (last !== undefined && (inAdvance ? k >= last : k > last)) return [];
      if (inAdvance) {
        // The last date in the window starts a period mostly beyond it;
        // it's still invoiced then, so it's kept.
        return [{ ...base, period: { from: date, to: billingDate(startsAt, k + every) } }];
      }
      return k === 0
        ? []
        : [{ ...base, period: { from: billingDate(startsAt, k - every), to: date } }];
    });
    const usage = billsUsage && k > 0;
    if (charges.length === 0 && !usage) continue;
    invoices.push({
      date,
      dueDate: netDays === undefined ? undefined : new Date(date.getTime() + netDays * DAY_MS),
      charges,
      total: Math.round(charges.reduce((sum, charge) => sum + charge.total, 0) * 100) / 100,
      billsUsage: usage,
    });
  }
  return invoices;
};

/**
 * contractInvoiceSchedule for a contract billed on the account's invoice
 * day: invoiced on its start, then on each invoice day. Each recurring fee's
 * first period runs from the start to its first billing date and is
 * prorated, and its renewals are whole periods from there.
 */
const invoiceDaySchedule = ({
  startsAt,
  fees,
  billsUsage,
  netDays,
  invoiceDay,
  months,
}: {
  startsAt: Date;
  fees: ContractFee[];
  billsUsage: boolean;
  netDays?: number;
  invoiceDay: number;
  months: number;
}): ScheduledInvoice[] => {
  const first = nextBillingDate(startsAt, invoiceDay, 1);
  const dates = [startsAt];
  for (let k = first > startsAt ? 0 : 1; dates.length <= months; k++) {
    dates.push(addMonthsUtc(first, k));
  }
  const horizon = dates[dates.length - 1].getTime();
  const byDate = new Map<number, ScheduledCharge[]>(dates.map((date) => [date.getTime(), []]));
  const add = (date: Date, charge: ScheduledCharge) => {
    if (date.getTime() <= horizon) byDate.get(date.getTime())?.push(charge);
  };

  for (const fee of fees) {
    const base = {
      name: fee.name,
      label: fee.label,
      chargeType: fee.chargeType,
      interval: fee.interval,
      total: discountedFeeTotal(fee),
    };
    if (fee.chargeType === 'OneTime') {
      add(startsAt, base);
      continue;
    }
    const every = intervalMonths(fee.interval);
    const feeFirst = nextBillingDate(startsAt, invoiceDay, every);
    const inAdvance = (fee.billingTiming ?? 'InAdvance') === 'InAdvance';
    const periods: { from: Date; to: Date; share: number }[] = [];
    if (feeFirst > startsAt) {
      const whole = feeFirst.getTime() - addMonthsUtc(feeFirst, -every).getTime();
      periods.push({
        from: startsAt,
        to: feeFirst,
        share: (feeFirst.getTime() - startsAt.getTime()) / whole,
      });
    }
    for (let i = 0; ; i++) {
      if (fee.periods && i >= fee.periods) break;
      const from = addMonthsUtc(feeFirst, i * every);
      if (from.getTime() > horizon) break;
      periods.push({ from, to: addMonthsUtc(feeFirst, (i + 1) * every), share: 1 });
    }
    for (const period of periods) {
      const charge = {
        ...base,
        total: Math.round(base.total * period.share * 100) / 100,
        period: { from: period.from, to: period.to },
      };
      add(inAdvance ? period.from : period.to, charge);
    }
  }

  return dates.flatMap((date, k): ScheduledInvoice[] => {
    const charges = byDate.get(date.getTime()) ?? [];
    const usage = billsUsage && k > 0;
    if (charges.length === 0 && !usage) return [];
    return [
      {
        date,
        dueDate: netDays === undefined ? undefined : new Date(date.getTime() + netDays * DAY_MS),
        charges,
        total: Math.round(charges.reduce((sum, charge) => sum + charge.total, 0) * 100) / 100,
        billsUsage: usage,
      },
    ];
  });
};

/** `months` months after a billing date, on the same day (1 to 28). */
const addMonthsUtc = (date: Date, months: number) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));

/** The schedule's invoices still to come: those dated after `now`. */
export const upcomingInvoices = (schedule: ScheduledInvoice[], now: Date) =>
  schedule.filter((invoice) => invoice.date.getTime() > now.getTime());

/**
 * The invoices worth pointing out: the next one, and any later one that
 * charges a one-time, quarterly or annual fee, which differ from the
 * monthly run. Up to `max`, in date order.
 */
export const notableInvoices = (upcoming: ScheduledInvoice[], max = 4) =>
  upcoming
    .filter(
      (invoice, index) =>
        index === 0 ||
        invoice.charges.some(
          (charge) =>
            charge.chargeType === 'OneTime' || (charge.interval && charge.interval !== 'monthly')
        )
    )
    .slice(0, max);
