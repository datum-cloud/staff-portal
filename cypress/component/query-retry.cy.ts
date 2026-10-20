import { shouldRetryQuery } from '@/modules/tanstack/query';
import {
  AuthenticationError,
  CursorExpiredError,
  NotFoundError,
  ValidationError,
  UpstreamError,
  UpstreamTimeoutError,
} from '@/utils/errors';

describe('shouldRetryQuery', () => {
  it('does not retry expected 4xx AppErrors', () => {
    expect(shouldRetryQuery(0, new CursorExpiredError('continue token is expired'))).to.equal(
      false
    );
    expect(shouldRetryQuery(0, new NotFoundError('project not found'))).to.equal(false);
    expect(shouldRetryQuery(0, new ValidationError('bad input'))).to.equal(false);
    expect(shouldRetryQuery(0, new AuthenticationError('signed out'))).to.equal(false);
  });

  it('keeps retrying server failures until the count is exhausted', () => {
    expect(shouldRetryQuery(0, new UpstreamError('upstream failed', 503))).to.equal(true);
    expect(shouldRetryQuery(2, new UpstreamError('upstream failed', 503))).to.equal(true);
    expect(shouldRetryQuery(3, new UpstreamError('upstream failed', 503))).to.equal(false);
    expect(shouldRetryQuery(0, new UpstreamTimeoutError())).to.equal(true);
  });

  it('keeps retrying plain errors that have no status', () => {
    expect(shouldRetryQuery(0, new Error('gateway is down'))).to.equal(true);
    expect(shouldRetryQuery(3, new Error('gateway is down'))).to.equal(false);
  });
});
