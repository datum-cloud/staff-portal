import { errorPaths } from './show-submit-errors';
import type { FieldErrors } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

describe('errorPaths', () => {
  it('finds errors on rows of fees and the price list, as well as top-level ones', () => {
    const errors = {
      fees: [undefined, { amount: { type: 'custom', message: 'Enter an amount.' } }],
      listFees: {
        10: {
          amount: { type: 'custom', message: 'Priced per contract.' },
          quantity: { type: 'custom', message: '1 to 10000.' },
        },
      },
      startsAt: { type: 'custom', message: 'Pick a start date.' },
    } as unknown as FieldErrors;
    expect(errorPaths(errors).sort()).toEqual([
      'fees.1.amount',
      'listFees.10.amount',
      'listFees.10.quantity',
      'startsAt',
    ]);
  });

  it('keeps an error on an array itself, such as "add a fee"', () => {
    const errors = { fees: { message: 'Add a fee.', type: 'custom' } } as unknown as FieldErrors;
    expect(errorPaths(errors)).toEqual(['fees']);
  });

  it('is empty without errors', () => {
    expect(errorPaths({})).toEqual([]);
    expect(errorPaths(undefined)).toEqual([]);
  });
});
