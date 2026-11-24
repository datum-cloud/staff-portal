import type { ChargeFormValues } from '../../lib/charges';
import { apiFieldErrors } from '../../lib/server-errors';
import { t } from '@lingui/core/macro';

/**
 * Billing's webhook refuses a charge with a Kubernetes Invalid status: one
 * cause per field, such as `spec.quantity` for cents that don't divide.
 * These put each on its field in the add charge form, the way the
 * contract editor shows its rows' errors, and the rest above the buttons.
 */

/** One refusal: the form field it belongs to, if any, and what it says. */
export interface ChargeServerError {
  field?: keyof ChargeFormValues;
  message: string;
}

const FIELD_BY_PATH: Record<string, keyof ChargeFormValues> = {
  'spec.servicePricingRef': 'item',
  'spec.servicePricingRef.name': 'item',
  'spec.description': 'description',
  'spec.quantity': 'quantity',
  'spec.unitAmount': 'unitAmount',
  'spec.tax': 'taxCode',
  'spec.tax.code': 'taxCode',
  'spec.tax.taxable': 'taxCode',
  'spec.discountPercent': 'discountPercent',
  'spec.note': 'note',
  'spec.servicePeriod': 'periodStart',
  'spec.servicePeriod.start': 'periodStart',
  'spec.servicePeriod.end': 'periodEnd',
};

const PERIOD_FIELDS = new Set<keyof ChargeFormValues>(['periodStart', 'periodEnd']);

/**
 * The form field for an API field path. The supply date's fields only show
 * while staff are choosing it; otherwise billing chose the period, so its
 * errors go above the buttons.
 */
export const chargeFieldForPath = (
  path: string | undefined,
  setPeriod: boolean
): keyof ChargeFormValues | undefined => {
  const field = path ? FIELD_BY_PATH[path] : undefined;
  if (field && PERIOD_FIELDS.has(field) && !setPeriod) return undefined;
  return field;
};

/** What the webhook refused, field by field, from a failed create. */
export const chargeServerErrors = (err: unknown, setPeriod: boolean): ChargeServerError[] =>
  apiFieldErrors(err, t`Couldn't add the charge.`).map(({ path, message }) =>
    path ? { field: chargeFieldForPath(path, setPeriod), message } : { message }
  );

export { causeMessage } from '../../lib/server-errors';
