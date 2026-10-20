import { withCursorReset } from '@/resources/request/client/queries/cursor-reset';
import { CursorExpiredError } from '@/utils/errors';

describe('withCursorReset', () => {
  it('does not retry when there is no cursor yet', () => {
    const calls: Array<string | undefined> = [];

    cy.wrap(null)
      .then(() =>
        withCursorReset((cursor) => {
          calls.push(cursor);
          return Promise.resolve({ items: ['a'] });
        })
      )
      .then((result) => {
        expect(result).to.deep.equal({ items: ['a'] });
        expect(calls).to.deep.equal([undefined]);
      });
  });

  it('refetches the first page when the cursor expired', () => {
    const calls: Array<string | undefined> = [];

    cy.wrap(null)
      .then(() =>
        withCursorReset((cursor) => {
          calls.push(cursor);
          if (cursor) return Promise.reject(new CursorExpiredError('continue token is expired'));
          return Promise.resolve({ items: ['a'] });
        }, 'stale-token')
      )
      .then((result) => {
        expect(result).to.deep.equal({ items: ['a'] });
        expect(calls).to.deep.equal(['stale-token', undefined]);
      });
  });

  it('surfaces any other error unchanged', () => {
    cy.wrap(null)
      .then(() =>
        withCursorReset(() => Promise.reject(new Error('gateway is down')), 'stale-token').then(
          () => {
            throw new Error('expected withCursorReset to throw');
          },
          (error: unknown) => error
        )
      )
      .then((error) => {
        expect((error as Error).message).to.equal('gateway is down');
      });
  });
});
