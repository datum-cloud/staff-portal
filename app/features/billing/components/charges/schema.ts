import {
  CHARGE_PERIOD_MAX_YEARS_AHEAD,
  CHARGE_PERIOD_MAX_YEARS_BACK,
  CHARGE_PERIOD_MAX_YEARS_LONG,
  chargeAmounts,
  MAX_CHARGE_DESCRIPTION,
  MAX_CHARGE_NOTE,
  parseHundredths,
  servicePeriodProblems,
  type ChargeFormValues,
} from '../../lib/charges';
import { t } from '@lingui/core/macro';
import { z } from 'zod';

/**
 * The add charge form's schema: billing's rules for a charge, checked as
 * staff type, so most refusals never reach the webhook. Billing checks them
 * all again.
 */
export const buildChargeSchema = (now: Date) =>
  z
    .object({
      item: z.string(),
      description: z.string(),
      quantity: z.string(),
      unitAmount: z.string(),
      taxCode: z.string(),
      notTaxable: z.boolean(),
      discountPercent: z.string(),
      setPeriod: z.boolean(),
      periodStart: z.string(),
      periodEnd: z.string(),
      note: z.string(),
      invoice: z.enum(['NextInvoice', 'Now']),
    })
    .superRefine((values, ctx) => {
      const issue = (path: keyof ChargeFormValues, message: string) =>
        ctx.addIssue({ code: 'custom', path: [path], message });

      if (!values.item.trim()) {
        issue('item', t`Pick a catalog item, or type a name for a custom one.`);
      }
      const description = values.description.trim();
      if (!description) {
        issue('description', t`Describe the charge, as the invoice will show it.`);
      } else if (description.length > MAX_CHARGE_DESCRIPTION) {
        issue('description', t`Keep it to ${MAX_CHARGE_DESCRIPTION} characters.`);
      }

      const quantity = parseHundredths(values.quantity);
      if (quantity === null || quantity <= 0n) {
        issue('quantity', t`More than 0, with up to two decimal places, such as 2 or 3.5.`);
      }
      const unitAmount = parseHundredths(values.unitAmount);
      if (!values.unitAmount.trim()) {
        issue('unitAmount', t`Enter a price per unit, such as 250.00.`);
      } else if (unitAmount === null) {
        issue('unitAmount', t`A price with up to two decimal places, such as 250.00.`);
      }
      const discount = values.discountPercent.trim();
      const pct = discount ? parseHundredths(discount) : 0n;
      if (discount && (pct === null || pct <= 0n || pct > 10000n)) {
        issue('discountPercent', t`More than 0 and up to 100, with up to two decimal places.`);
      }

      if (quantity !== null && quantity > 0n && unitAmount !== null) {
        const amounts = chargeAmounts(values.quantity, values.unitAmount, discount);
        if (!amounts.ok && amounts.problem === 'amount') {
          issue(
            'quantity',
            t`The quantity times the price isn't whole cents. Change the quantity or the price.`
          );
        } else if (!amounts.ok && amounts.problem === 'discount') {
          issue(
            'discountPercent',
            t`The discount isn't whole cents of the amount. Change the discount.`
          );
        }
      }

      const note = values.note.trim();
      if (note.length > MAX_CHARGE_NOTE) {
        issue('note', t`Keep the note to ${MAX_CHARGE_NOTE} characters.`);
      } else if (values.notTaxable && !note) {
        issue('note', t`Say why the charge isn't taxable.`);
      }

      if (!values.setPeriod) return;
      for (const problem of servicePeriodProblems(
        { start: values.periodStart, end: values.periodEnd },
        now
      )) {
        const field = problem.field === 'start' ? 'periodStart' : 'periodEnd';
        switch (problem.problem) {
          case 'missing':
            issue(field, problem.field === 'start' ? t`Pick a start date.` : t`Pick an end date.`);
            break;
          case 'before-start':
            issue(field, t`The end can't be before the start.`);
            break;
          case 'too-long':
            issue(field, t`A supply date can be up to ${CHARGE_PERIOD_MAX_YEARS_LONG} years long.`);
            break;
          case 'too-far-back':
            issue(
              field,
              t`A supply date can start up to ${CHARGE_PERIOD_MAX_YEARS_BACK} years ago.`
            );
            break;
          case 'too-far-ahead':
            issue(
              field,
              t`A supply date can end up to ${CHARGE_PERIOD_MAX_YEARS_AHEAD} years from now.`
            );
            break;
        }
      }
    });
