import { CursorExpiredError, UpstreamError, UpstreamTimeoutError } from '@/utils/errors';
import { mapApiError } from '@/utils/errors/error-mapper';
import { CombinedError } from '@urql/core';

const REQUEST_ID = 'req-42';

/** A legacy gqlts-style response object, which `isGqlError` matches. */
function gqltsError(code: string, message: string, extensions: Record<string, unknown> = {}) {
  return { errors: [{ message, extensions: { code, ...extensions } }] };
}

/** A urql CombinedError carrying the same GraphQL error. */
function urqlError(code: string, message: string, extensions: Record<string, unknown> = {}) {
  return new CombinedError({ graphQLErrors: [{ message, extensions: { code, ...extensions } }] });
}

const branches = [
  ['gqlts-style', gqltsError],
  ['urql CombinedError', urqlError],
] as const;

describe('mapApiError gateway codes', () => {
  branches.forEach(([branch, makeError]) => {
    describe(branch, () => {
      it('maps UPSTREAM_TIMEOUT to a 504 that says the request timed out', () => {
        const error = mapApiError(
          makeError('UPSTREAM_TIMEOUT', 'upstream request timed out after 10s'),
          REQUEST_ID
        );

        expect(error).to.be.instanceOf(UpstreamTimeoutError);
        expect(error.statusCode).to.equal(504);
        expect(error.code).to.equal('UPSTREAM_TIMEOUT');
        expect(error.message).to.match(/timed out/i);
        expect(error.requestId).to.equal(REQUEST_ID);
      });

      it('still says the request timed out when the gateway message does not', () => {
        const error = mapApiError(makeError('UPSTREAM_TIMEOUT', 'deadline exceeded'));

        expect(error.message).to.match(/timed out/i);
      });

      it('maps UPSTREAM_ERROR to a 502 carrying the upstream status', () => {
        const error = mapApiError(
          makeError('UPSTREAM_ERROR', 'upstream service returned 503 Service Unavailable', {
            status: 503,
          }),
          REQUEST_ID
        );

        expect(error).to.be.instanceOf(UpstreamError);
        expect(error.statusCode).to.equal(502);
        expect(error.code).to.equal('UPSTREAM_ERROR');
        expect((error as UpstreamError).upstreamStatus).to.equal(503);
        expect(error.requestId).to.equal(REQUEST_ID);
      });

      it('maps UPSTREAM_ERROR without an extensions.status to a 502', () => {
        const error = mapApiError(makeError('UPSTREAM_ERROR', 'upstream call failed'));

        expect(error.statusCode).to.equal(502);
        expect((error as UpstreamError).upstreamStatus).to.be.undefined;
      });

      it('ignores upstream statuses that are not HTTP error integers', () => {
        for (const status of [0, -1, 200.5, '0', '503.5', 'nope', 600]) {
          const error = mapApiError(
            makeError('UPSTREAM_ERROR', 'upstream call failed', { status })
          );

          expect((error as UpstreamError).upstreamStatus, `status ${String(status)}`).to.be
            .undefined;
        }
      });

      it('accepts a numeric string upstream status', () => {
        const error = mapApiError(
          makeError('UPSTREAM_ERROR', 'upstream call failed', { status: '503' })
        );

        expect((error as UpstreamError).upstreamStatus).to.equal(503);
      });

      it('maps CURSOR_EXPIRED to a CursorExpiredError', () => {
        const error = mapApiError(
          makeError('CURSOR_EXPIRED', 'continue token is expired'),
          REQUEST_ID
        );

        expect(error).to.be.instanceOf(CursorExpiredError);
        expect(error.statusCode).to.equal(410);
        expect(error.code).to.equal('CURSOR_EXPIRED');
        expect(error.requestId).to.equal(REQUEST_ID);
      });
    });
  });

  it('keeps unknown codes on the generic 500 path', () => {
    const error = mapApiError(gqltsError('SOMETHING_NEW', 'unexpected'));

    expect(error.statusCode).to.equal(500);
    expect(error.code).to.equal('SOMETHING_NEW');
  });
});
