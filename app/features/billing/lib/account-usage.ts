import type { UsageGroupSection, UsageMeter } from '@/features/organization/usage/usage.types';
import type { UsageView } from '@/features/organization/usage/usage.view';
import {
  buildBillingCycleWindows,
  getNextCycleStart,
  type PaymentTermsInput,
} from '@/modules/billing/billing-cycle';

/**
 * Selectors for the billing account dashboard's usage card, over the view
 * the org usage dashboard builds (`toUsageView`).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const meterSpend = (meter: UsageMeter): number => meter.spend?.amount ?? 0;

const bySpendDesc = (a: UsageMeter, b: UsageMeter): number => meterSpend(b) - meterSpend(a);

export interface ServiceSpend {
  id: string;
  title: string;
  amount: number;
  /** The service's highest-spend meter, which a click on the service selects. */
  topMeterId: string;
}

export interface MeterOptionGroup {
  id: string;
  title: string;
  /** Meters with usage this cycle, highest spend first. Idle meters are left out. */
  meters: UsageMeter[];
}

const groupSpend = (group: UsageGroupSection): number =>
  group.meters.reduce((total, meter) => total + meterSpend(meter), 0);

/** Services with usage, highest spend first. */
export const getServiceSpend = (view: UsageView): ServiceSpend[] =>
  view.groups
    .filter((group) => group.meters.length > 0)
    .map((group) => ({
      id: group.id,
      title: group.title,
      amount: groupSpend(group),
      topMeterId: [...group.meters].sort(bySpendDesc)[0].id,
    }))
    .sort((a, b) => b.amount - a.amount);

/** The meter select's groups: services by spend, each with its meters by spend. */
export const getMeterOptionGroups = (view: UsageView): MeterOptionGroup[] => {
  const order = new Map(getServiceSpend(view).map((service, index) => [service.id, index]));
  return view.groups
    .filter((group) => order.has(group.id))
    .map((group) => ({
      id: group.id,
      title: group.title,
      meters: [...group.meters].sort(bySpendDesc),
    }))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
};

/** The meter the card opens on: the highest spend across every service. */
export const getTopMeter = (view: UsageView): UsageMeter | undefined =>
  view.groups.flatMap((group) => group.meters).sort(bySpendDesc)[0];

export interface CycleProgress {
  start: Date;
  end: Date;
  /** 1-based day of the cycle `now` falls on. */
  day: number;
  days: number;
}

/** Where `now` sits in the account's current billing cycle. */
export const getCycleProgress = (
  terms: PaymentTermsInput | undefined,
  now: Date
): CycleProgress => {
  const [current] = buildBillingCycleWindows(terms, now);
  const start = new Date(current.startSec * 1000);
  const end = getNextCycleStart(terms, now);
  // Rounded: a daylight-saving change makes a cycle an hour short or long.
  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  const day = Math.min(days, Math.floor((now.getTime() - start.getTime()) / DAY_MS) + 1);
  return { start, end, day, days };
};
