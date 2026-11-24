import { apiFieldErrors } from './server-errors';
import { describe, expect, it } from 'vitest';

const apiError = (data: unknown) =>
  Object.assign(new Error('Request failed with status code 422'), {
    response: { status: 422, data },
  });

describe('apiFieldErrors', () => {
  it('reads indexed paths from the message when the causes didn’t come through', () => {
    const err = apiError({
      message:
        'admission webhook "vbillingaccount.kb.io" denied the request: BillingAccount.billing.miloapis.com "acme" is invalid: [spec.contactInfo.email: Invalid value: "jane@acme": must be a valid email address, spec.taxIds[1].type: Duplicate value: "gb_vat"]',
    });
    expect(apiFieldErrors(err, 'fallback')).toEqual([
      {
        path: 'spec.contactInfo.email',
        message: 'Must be a valid email address',
        raw: 'Invalid value: "jane@acme": must be a valid email address',
      },
      { path: 'spec.taxIds[1].type', message: '"gb_vat"', raw: 'Duplicate value: "gb_vat"' },
    ]);
  });

  it('uses the fallback when the error says nothing', () => {
    expect(apiFieldErrors({}, 'Couldn’t save.')).toEqual([{ message: 'Couldn’t save.', raw: '' }]);
  });
});
