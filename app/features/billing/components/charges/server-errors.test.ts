import {
  causeMessage,
  chargeDraftServerErrors,
  chargeFieldForPath,
  chargeServerErrors,
} from './server-errors';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray, ...values: unknown[]) =>
    String.raw({ raw: strings }, ...values),
}));

/** An axios error carrying the API's response body. */
const apiError = (data: unknown) =>
  Object.assign(new Error('Request failed with status code 422'), {
    response: { status: 422, data },
  });

describe('chargeServerErrors', () => {
  it('puts each cause on its field', () => {
    const err = apiError({
      kind: 'Status',
      message: 'admission webhook "vcharge.kb.io" denied the request: Charge "" is invalid',
      details: {
        causes: [
          {
            field: 'spec.quantity',
            reason: 'FieldValueInvalid',
            message:
              'Invalid value: "3.33": 3.33 × 0.15 comes to 0.4995, which isn\'t whole cents; change the quantity or the price',
          },
          {
            field: 'spec.note',
            reason: 'FieldValueRequired',
            message: "Required value: a charge that isn't taxable needs a note saying why",
          },
        ],
      },
    });
    expect(chargeServerErrors(err, false)).toEqual([
      {
        field: 'quantity',
        message:
          "3.33 × 0.15 comes to 0.4995, which isn't whole cents; change the quantity or the price",
      },
      { field: 'note', message: "A charge that isn't taxable needs a note saying why" },
    ]);
  });

  it('reads the fields from the message when the causes didn’t come through', () => {
    const err = apiError({
      data: {
        message:
          'admission webhook "vcharge.kb.io" denied the request: Charge.billing.miloapis.com "" is invalid: [spec.servicePeriod.end: Invalid value: "2026-12-01": the service period can\'t end before it starts, spec.billingAccountRef.name: Forbidden: charges aren\'t available for billing account "acme" yet]',
      },
    });
    expect(chargeServerErrors(err, true)).toEqual([
      { field: 'periodEnd', message: "The service period can't end before it starts" },
      { field: undefined, message: 'Charges aren\'t available for billing account "acme" yet' },
    ]);
  });

  it('falls back to the whole message', () => {
    expect(
      chargeServerErrors(apiError({ message: 'charges.billing "x" is forbidden: no' }), false)
    ).toEqual([{ message: 'No' }]);
    expect(chargeServerErrors(new Error('Network Error'), false)).toEqual([
      { message: 'Network Error' },
    ]);
  });
});

describe('chargeDraftServerErrors', () => {
  it('names the line each cause is for', () => {
    const err = apiError({
      kind: 'Status',
      message: 'admission webhook "vchargedraft.kb.io" denied the request',
      details: {
        causes: [
          {
            field: 'spec.lines[1].quantity',
            message: 'Invalid value: "3.33": 3.33 × 0.15 isn\'t whole cents',
          },
          { field: 'spec.billingAccountRef.name', message: "Forbidden: charges aren't available" },
        ],
      },
    });
    expect(chargeDraftServerErrors(err)).toEqual([
      "Line 2: 3.33 × 0.15 isn't whole cents",
      "Charges aren't available",
    ]);
  });

  it('reads lines from the message when the causes didn’t come through', () => {
    const err = apiError({
      message:
        'ChargeDraft "acme-draft-x" is invalid: [spec.lines[0].note: Required value: a note is needed, spec.lines[2].unitAmount: Required value: a price is required]',
    });
    expect(chargeDraftServerErrors(err)).toEqual([
      'Line 1: A note is needed',
      'Line 3: A price is required',
    ]);
  });
});

describe('chargeFieldForPath', () => {
  it('maps spec paths to the form’s fields', () => {
    expect(chargeFieldForPath('spec.unitAmount', false)).toBe('unitAmount');
    expect(chargeFieldForPath('spec.servicePricingRef.name', false)).toBe('item');
    expect(chargeFieldForPath('spec.tax.code', false)).toBe('taxCode');
    expect(chargeFieldForPath('spec.currency', false)).toBeUndefined();
  });

  it('only puts period errors on the dates while staff choose them', () => {
    expect(chargeFieldForPath('spec.servicePeriod.start', true)).toBe('periodStart');
    expect(chargeFieldForPath('spec.servicePeriod.start', false)).toBeUndefined();
  });
});

describe('causeMessage', () => {
  it('drops the kind of error', () => {
    expect(causeMessage('Not found: "install-v9"')).toBe('Not found: "install-v9"');
    expect(causeMessage("Forbidden: an invoiced charge can't be removed")).toBe(
      "An invoiced charge can't be removed"
    );
  });
});
