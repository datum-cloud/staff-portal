import { createRateLimiter } from './rate-limiter';
import { describe, expect, it } from 'vitest';

function createClock(start = 1_000) {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

describe('createRateLimiter', () => {
  it('allows up to max requests per window, then refuses', () => {
    const clock = createClock();
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3, maxEntries: 10, now: clock.now });

    expect([1, 2, 3].map(() => limiter.check('user-a'))).toEqual([true, true, true]);
    expect(limiter.check('user-a')).toBe(false);
  });

  it('counts each key separately', () => {
    const clock = createClock();
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, maxEntries: 10, now: clock.now });

    expect(limiter.check('user-a')).toBe(true);
    expect(limiter.check('user-b')).toBe(true);
    expect(limiter.check('user-a')).toBe(false);
  });

  it('starts a new window once the previous one has passed', () => {
    const clock = createClock();
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, maxEntries: 10, now: clock.now });

    expect(limiter.check('user-a')).toBe(true);
    expect(limiter.check('user-a')).toBe(false);

    clock.advance(60_001);

    expect(limiter.check('user-a')).toBe(true);
  });

  it('drops expired windows when the map is full', () => {
    const clock = createClock();
    const limiter = createRateLimiter({ windowMs: 60_000, max: 5, maxEntries: 3, now: clock.now });

    ['a', 'b', 'c'].forEach((key) => limiter.check(key));
    clock.advance(60_001);
    limiter.check('d');

    expect(limiter.size()).toBe(1);
  });

  it('evicts the oldest window when the map is full of active windows', () => {
    const clock = createClock();
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, maxEntries: 2, now: clock.now });

    limiter.check('a');
    limiter.check('b');
    limiter.check('c');

    expect(limiter.size()).toBe(2);
    // 'b' is still tracked and over its limit; 'a' was evicted and starts over.
    expect(limiter.check('b')).toBe(false);
    expect(limiter.check('a')).toBe(true);
  });

  it('never tracks more than maxEntries keys', () => {
    const clock = createClock();
    const limiter = createRateLimiter({ windowMs: 60_000, max: 5, maxEntries: 50, now: clock.now });

    Array.from({ length: 500 }, (_, i) => `user-${i}`).forEach((key) => limiter.check(key));

    expect(limiter.size()).toBe(50);
  });
});
