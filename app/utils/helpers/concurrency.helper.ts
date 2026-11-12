/** Runs a task under a concurrency limit, resolving or rejecting with the task's own result. */
export type ConcurrencyLimit = <T>(task: () => Promise<T>) => Promise<T>;

/**
 * Lets at most `limit` tasks run at once; the rest wait in call order. Used to
 * fan out one request per project across an organization without firing every
 * project's request at the same moment.
 *
 * A finishing task hands its slot straight to the next waiter, so a task that
 * starts in between can't push the count past `limit`.
 */
export function createConcurrencyLimit(limit: number): ConcurrencyLimit {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`Concurrency limit must be a positive integer, got ${limit}`);
  }

  let active = 0;
  const waiting: (() => void)[] = [];

  const release = (): void => {
    const next = waiting.shift();
    if (next) {
      next();
    } else {
      active--;
    }
  };

  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active < limit) {
      active++;
    } else {
      await new Promise<void>((resolve) => waiting.push(resolve));
    }

    try {
      return await task();
    } finally {
      release();
    }
  };
}
