import type { ChargeFormValues } from '../../lib/charges';
import { parseK8sMessage } from '@/utils/errors';
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

const QUOTED = '"(?:[^"\\\\]|\\\\.)*"';
/** The kind of error Kubernetes puts before each field's detail. */
const CAUSE_PREFIX = new RegExp(
  `^(?:Invalid value: (?:${QUOTED}|[^:]*): |Unsupported value: (?:${QUOTED}|[^:]*): |Required value: |Forbidden: |Too long: |Duplicate value: )`
);

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** A cause's message without its kind, e.g. "Required value: a note…" → "A note…". */
export const causeMessage = (message: string): string => {
  const trimmed = message.trim();
  const detail = trimmed.replace(CAUSE_PREFIX, '').trim();
  return capitalize(detail || trimmed);
};

interface StatusCause {
  field?: string;
  message?: string;
}

interface StatusLike {
  message?: string;
  details?: { causes?: StatusCause[] };
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** The Kubernetes Status in an API error, wherever the proxy put it. */
const findStatus = (err: unknown): StatusLike | undefined => {
  if (!isObject(err)) return undefined;
  const response = isObject(err.response) ? err.response : undefined;
  const data = response?.data;
  const candidates = [
    data,
    isObject(data) ? data.data : undefined,
    isObject(data) ? data.error : undefined,
  ];
  const statuses = candidates.filter(isObject) as StatusLike[];
  return (
    statuses.find((status) => Array.isArray(status.details?.causes)) ??
    statuses.find((status) => typeof status.message === 'string')
  );
};

/**
 * Field errors from an Invalid status's message, for when the causes didn't
 * come through: `… is invalid: [spec.quantity: Invalid value: "3.33": …,
 * spec.note: Required value: …]`.
 */
const causesFromMessage = (message: string): StatusCause[] => {
  const causes: StatusCause[] = [];
  const pattern = /(spec(?:\.[A-Za-z]+)+): ((?:(?!, spec\.).)+?)(?=, spec\.|\]?$)/g;
  for (const match of message.matchAll(pattern)) {
    causes.push({ field: match[1], message: match[2] });
  }
  return causes;
};

/** What the webhook refused, field by field, from a failed create. */
export const chargeServerErrors = (err: unknown, setPeriod: boolean): ChargeServerError[] => {
  const status = findStatus(err);
  const message = status?.message ?? (err instanceof Error ? err.message : '');
  const causes = status?.details?.causes?.filter((cause) => cause.message) ?? [];
  const found = causes.length > 0 ? causes : message ? causesFromMessage(message) : [];
  if (found.length > 0) {
    return found.map((cause) => ({
      field: chargeFieldForPath(cause.field, setPeriod),
      message: causeMessage(cause.message ?? ''),
    }));
  }
  return [{ message: message ? parseK8sMessage(message) : t`Couldn't add the charge.` }];
};
