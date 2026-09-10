import { isWatchRequest } from '@/server/lib/watch';

describe('isWatchRequest', () => {
  it('detects the values a Kubernetes client sends for a watch', () => {
    expect(isWatchRequest('true')).to.equal(true);
    expect(isWatchRequest('TRUE')).to.equal(true);
    expect(isWatchRequest('1')).to.equal(true);
  });

  it('returns false when the parameter is absent', () => {
    expect(isWatchRequest(undefined)).to.equal(false);
  });

  it('returns false for values that disable the watch', () => {
    expect(isWatchRequest('')).to.equal(false);
    expect(isWatchRequest('false')).to.equal(false);
    expect(isWatchRequest('FALSE')).to.equal(false);
    expect(isWatchRequest('0')).to.equal(false);
  });
});
