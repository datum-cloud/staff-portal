import { parseK8sMessage } from '@/utils/errors';

/**
 * Billing's webhooks refuse a write with a Kubernetes Invalid status: one
 * cause per field, such as `spec.quantity` or `spec.taxIds[1].type`. These
 * read the causes from an API error, for a form to put each on its field.
 */

/** One refusal: the API field path it names, if any, and what it says. */
export interface ApiFieldError {
  path?: string;
  /** The cause's message without its kind, e.g. "Must be a valid email address". */
  message: string;
  /** The cause's message as billing sent it, e.g. `Duplicate value: "gb_vat"`. */
  raw: string;
}

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
 * spec.taxIds[0].type: Required value: …]`.
 */
const causesFromMessage = (message: string): StatusCause[] => {
  const causes: StatusCause[] = [];
  const pattern = /(spec(?:\.[A-Za-z]+|\[\d+\])+): ((?:(?!, spec[.[]).)+?)(?=, spec[.[]|\]?$)/g;
  for (const match of message.matchAll(pattern)) {
    causes.push({ field: match[1], message: match[2] });
  }
  return causes;
};

/**
 * What a webhook refused, cause by cause, from a failed write; or the whole
 * message as one error without a path, or `fallback` when there's none.
 */
export const apiFieldErrors = (err: unknown, fallback: string): ApiFieldError[] => {
  const status = findStatus(err);
  const message = status?.message ?? (err instanceof Error ? err.message : '');
  const causes = status?.details?.causes?.filter((cause) => cause.message) ?? [];
  const found = causes.length > 0 ? causes : message ? causesFromMessage(message) : [];
  if (found.length > 0) {
    return found.map((cause) => ({
      path: cause.field,
      message: causeMessage(cause.message ?? ''),
      raw: cause.message ?? '',
    }));
  }
  const whole = message ? parseK8sMessage(message) : fallback;
  return [{ message: whole, raw: message }];
};
