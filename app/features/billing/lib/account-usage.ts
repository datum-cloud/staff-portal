import type { UsageGroupSection, UsageMeter } from '@/features/organization/usage/usage.types';
import type { UsageView } from '@/features/organization/usage/usage.view';

/**
 * Selectors for the billing account dashboard's usage card, over the view
 * the org usage dashboard builds (`toUsageView`).
 */

export const meterSpend = (meter: UsageMeter): number => meter.spend?.amount ?? 0;

/**
 * What a meter's usage costs before discounts, which orders meters and
 * services: a 100% discount would otherwise leave every meter at 0.
 */
export const meterSpendBeforeDiscounts = (meter: UsageMeter): number =>
  meter.spend?.beforeDiscounts ?? meterSpend(meter);

const bySpendDesc = (a: UsageMeter, b: UsageMeter): number =>
  meterSpendBeforeDiscounts(b) - meterSpendBeforeDiscounts(a);

export interface ServiceSpend {
  id: string;
  title: string;
  /** What the service's usage costs, after discounts. */
  amount: number;
  /** What it costs before discounts; `amount` when nothing is discounted. */
  beforeDiscounts: number;
  /** What the discounts take off `beforeDiscounts`. */
  discount: number;
  /** The service's highest-spend meter, which a click on the service selects. */
  topMeterId: string;
}

export interface MeterOptionGroup {
  id: string;
  title: string;
  /** Meters with usage this cycle, highest spend first. Idle meters are left out. */
  meters: UsageMeter[];
}

const sum = (meters: UsageMeter[], value: (meter: UsageMeter) => number): number =>
  meters.reduce((total, meter) => total + value(meter), 0);

/** Services with usage, highest spend before discounts first. */
export const getServiceSpend = (view: UsageView): ServiceSpend[] =>
  view.groups
    .filter((group) => group.meters.length > 0)
    .map((group) => ({
      id: group.id,
      title: group.title,
      amount: sum(group.meters, meterSpend),
      beforeDiscounts: sum(group.meters, meterSpendBeforeDiscounts),
      discount: sum(group.meters, (meter) => meter.spend?.discount ?? 0),
      topMeterId: [...group.meters].sort(bySpendDesc)[0].id,
    }))
    .sort((a, b) => b.beforeDiscounts - a.beforeDiscounts);

/** The meter select's groups: services by spend, each with its meters by spend (before discounts). */
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

/** The meter the card opens on: the highest spend before discounts across every service. */
export const getTopMeter = (view: UsageView): UsageMeter | undefined =>
  view.groups.flatMap((group) => group.meters).sort(bySpendDesc)[0];
