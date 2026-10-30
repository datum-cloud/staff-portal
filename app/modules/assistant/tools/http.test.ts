import { firstGraphqlError, isToolError } from './http';
import { describe, expect, it } from 'vitest';

describe('firstGraphqlError', () => {
  it('returns undefined when there are no errors', () => {
    expect(firstGraphqlError()).toBeUndefined();
    expect(firstGraphqlError([])).toBeUndefined();
  });

  it('returns the first error message', () => {
    expect(
      firstGraphqlError([
        { message: 'You are not authorized to view this page.' },
        { message: 'second' },
      ])
    ).toBe('You are not authorized to view this page.');
  });

  it('falls back when the first error has no message', () => {
    expect(firstGraphqlError([{}])).toBe('unknown GraphQL error');
  });
});

describe('isToolError', () => {
  it('recognises the shared error shape', () => {
    expect(isToolError({ error: 'boom' })).toBe(true);
  });

  it('rejects non-errors', () => {
    expect(isToolError({ data: 1 })).toBe(false);
    expect(isToolError({ error: 500 })).toBe(false);
    expect(isToolError(null)).toBe(false);
    expect(isToolError('error')).toBe(false);
  });
});
