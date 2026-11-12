import {
  contractStartFromDate,
  contractStartProblem,
  MAX_CONTRACT_FEES,
  MAX_CONTRACT_LEAD_DAYS,
  parseAmount,
  type ContractFee,
} from '../../lib/contract';
import type { ListFeeRow } from '../../lib/contract-list-fees';
import { RATE_AMOUNT_PATTERN, type UsageRow } from '../../lib/contract-usage';
import { t } from '@lingui/core/macro';
import { z } from 'zod';

/** The service picker's value for a fee that isn't for any one service. */
export const NO_SERVICE = 'none';

/** Most of one fee a contract can charge, as billing allows. */
export const MAX_FEE_QUANTITY = 10000;

const isFeeQuantity = (value: string) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= MAX_FEE_QUANTITY;
};

const DISCOUNT_PATTERN = /^(100|[1-9]?\d)$/;

/**
 * A meter's row in the form. Unlike the lib's UsageRow, an empty amount
 * means the list rate, so a row with no amounts is billed at list rates.
 */
const usageRowSchema = z.object({
  metric: z.string(),
  selected: z.boolean(),
  pricingName: z.string(),
  discount: z.string(),
  amounts: z.array(z.string()),
  currentPricing: z.string().optional(),
});

/** When a recurring fee is invoiced: a term of the contract, on the Offer's reference. */
const billingTimingSchema = z.enum(['InAdvance', 'InArrears']);

/** A list fee's row in the form; an empty amount means the list amount. */
const listFeeRowSchema = z.object({
  name: z.string(),
  selected: z.boolean(),
  quantity: z.string(),
  discount: z.string(),
  amount: z.string(),
  billingTiming: billingTimingSchema,
  currentPricing: z.string().optional(),
});

/**
 * The contract form's schema. A new contract needs a start date to publish;
 * `isDraft` says when the form is being saved as a draft instead, which can
 * leave it for later (it's read at validation, as the button decides).
 */
export const buildContractSchema = (
  needsStart: boolean,
  allowOneTime: boolean,
  now: Date,
  isDraft: () => boolean = () => false
) =>
  z
    .object({
      fees: z.array(
        z.object({
          label: z
            .string()
            .trim()
            .min(1, t`Name the fee, as invoices show it.`),
          chargeType: z.enum(['OneTime', 'Recurring']),
          // For a recurring fee: how often it's charged, and when it's
          // invoiced. Kept on a one-time fee's row, and ignored.
          interval: z.enum(['monthly', 'quarterly', 'annual']),
          billingTiming: billingTimingSchema,
          amount: z.string().refine((value) => parseAmount(value) > 0, {
            message: t`Enter an amount, such as 1000 or 1000.00.`,
          }),
          quantity: z.string().refine(isFeeQuantity, {
            message: t`A whole number from 1 to ${MAX_FEE_QUANTITY}.`,
          }),
          pricingUnit: z
            .string()
            .trim()
            .max(64, t`Keep the unit short, such as port or kW.`),
          serviceRef: z.string(),
          existingPricing: z.string().optional(),
        })
      ),
      usage: z.array(usageRowSchema),
      listFees: z.array(listFeeRowSchema),
      startsAt: z.date().optional(),
    })
    .superRefine((values, ctx) => {
      const issue = (path: (string | number)[], message: string) =>
        ctx.addIssue({ code: 'custom', path, message });

      if (!allowOneTime) {
        values.fees.forEach((fee, index) => {
          if (fee.chargeType === 'OneTime') {
            issue(
              ['fees', index, 'chargeType'],
              t`The contract has started, so a one-time fee would be charged again.`
            );
          }
        });
      }
      const listFees = values.listFees.filter((row) => row.selected);
      const feeCount = values.fees.length + listFees.length;
      // A contract must bill something: a fee, or usage. Billing only needs
      // the Offer to have a pricing, and one billing only usage is fine.
      const billsUsage = values.usage.some((row) => row.selected);
      if (feeCount === 0 && !billsUsage) {
        issue(['fees'], t`Add a fee, or tick something on the price list.`);
      } else if (feeCount > MAX_CONTRACT_FEES) {
        issue(
          ['fees'],
          t`A contract can have at most ${MAX_CONTRACT_FEES} fees, counting those from the price list.`
        );
      }
      values.listFees.forEach((row, index) => {
        if (!row.selected) return;
        if (!isFeeQuantity(row.quantity.trim())) {
          issue(['listFees', index, 'quantity'], t`1 to ${MAX_FEE_QUANTITY}.`);
        }
        const discount = row.discount.trim();
        if (discount && !DISCOUNT_PATTERN.test(discount)) {
          issue(['listFees', index, 'discount'], t`0 to 100.`);
        }
        if (row.amount.trim() && !(parseAmount(row.amount) > 0)) {
          issue(['listFees', index, 'amount'], t`An amount, such as 250.00.`);
        }
      });
      values.usage.forEach((row, index) => {
        if (!row.selected) return;
        const discount = row.discount.trim();
        if (discount && !DISCOUNT_PATTERN.test(discount)) {
          issue(['usage', index, 'discount'], t`0 to 100.`);
        }
        row.amounts.forEach((amount, slot) => {
          if (amount.trim() && !RATE_AMOUNT_PATTERN.test(amount.trim())) {
            issue(['usage', index, 'amounts', slot], t`A rate, such as 0.000012.`);
          }
        });
      });

      if (!needsStart) return;
      if (!values.startsAt) {
        if (!isDraft()) issue(['startsAt'], t`Pick a start date.`);
        return;
      }
      const problem = contractStartProblem(contractStartFromDate(values.startsAt), now);
      if (problem) {
        issue(
          ['startsAt'],
          problem === 'past'
            ? t`A contract can't start in the past: charges can't be backdated.`
            : t`A contract can start at most ${MAX_CONTRACT_LEAD_DAYS} days ahead.`
        );
      }
    });

export type ContractFormValues = z.infer<ReturnType<typeof buildContractSchema>>;
export type ContractFeeRow = ContractFormValues['fees'][number];
export type UsageRowValues = ContractFormValues['usage'][number];
export type ListFeeRowValues = ContractFormValues['listFees'][number];

/** The form's usage row for one of the lib's: list rates left empty. */
export const toUsageRowValues = (row: UsageRow): UsageRowValues => ({
  metric: row.metric,
  selected: row.selected,
  pricingName: row.pricingName,
  discount: row.discount,
  amounts: row.custom ? row.amounts : row.amounts.map(() => ''),
  currentPricing: row.currentPricing,
});

/** The lib's usage row for one of the form's: empty amounts at list rates. */
export const fromUsageRowValues = (row: UsageRowValues, listAmounts: string[]): UsageRow => ({
  ...row,
  custom: row.amounts.some((amount) => amount.trim() !== ''),
  amounts: listAmounts.map((list, slot) => row.amounts[slot]?.trim() || list),
});

/** The form's list fee row for one of the lib's: the list amount left empty. */
export const toListFeeRowValues = (row: ListFeeRow): ListFeeRowValues => ({
  name: row.name,
  selected: row.selected,
  quantity: row.quantity,
  discount: row.discount,
  amount: row.custom ? row.amount : '',
  billingTiming: row.billingTiming,
  currentPricing: row.currentPricing,
});

/** The lib's list fee row for one of the form's. */
export const fromListFeeRowValues = (row: ListFeeRowValues): ListFeeRow => ({
  ...row,
  custom: row.amount.trim() !== '',
});

/**
 * Whether a fee row still charges exactly what an existing pricing does. A
 * recurring fee's interval is the pricing's; its timing isn't, it's on the
 * Offer's reference.
 */
export const sameFeePricing = (row: ContractFeeRow, fee: ContractFee) =>
  row.label.trim() === fee.label &&
  row.chargeType === fee.chargeType &&
  (row.chargeType === 'OneTime' || row.interval === (fee.interval ?? 'monthly')) &&
  parseAmount(row.amount) === fee.amount &&
  row.pricingUnit.trim() === (fee.pricingUnit ?? '') &&
  (row.serviceRef === NO_SERVICE ? '' : row.serviceRef) === (fee.serviceRef ?? '');

/** RFC 3339 at second precision, as Kubernetes writes times. */
export const toRfc3339 = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, 'Z');
