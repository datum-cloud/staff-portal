import { createConcurrencyLimit } from './concurrency.helper';
import { describe, expect, it } from 'vitest';

/** Tasks that stay pending until `finish(id)`, recording start order and peak concurrency. */
function trackedTasks() {
  let running = 0;
  let peak = 0;
  const started: number[] = [];
  const finishers = new Map<number, () => void>();

  const task = (id: number) => () =>
    new Promise<number>((resolve) => {
      running++;
      peak = Math.max(peak, running);
      started.push(id);
      finishers.set(id, () => {
        running--;
        resolve(id);
      });
    });

  return {
    task,
    finish: (id: number) => finishers.get(id)?.(),
    started,
    peak: () => peak,
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createConcurrencyLimit', () => {
  it('runs at most `limit` tasks at once, starting waiters in call order', async () => {
    const limit = createConcurrencyLimit(2);
    const { task, finish, started, peak } = trackedTasks();

    const results = [1, 2, 3, 4].map((id) => limit(task(id)));
    await flush();
    expect(started).toEqual([1, 2]);

    for (const id of [1, 2, 3, 4]) {
      finish(id);
      await flush();
    }

    await expect(Promise.all(results)).resolves.toEqual([1, 2, 3, 4]);
    expect(started).toEqual([1, 2, 3, 4]);
    expect(peak()).toBe(2);
  });

  it('hands a freed slot to the waiter, not to a task called in the same tick', async () => {
    const limit = createConcurrencyLimit(1);
    const { task, finish, started, peak } = trackedTasks();

    const first = limit(task(1));
    const waiter = limit(task(2));
    await flush();

    finish(1);
    const latecomer = limit(task(3));
    await flush();

    expect(started).toEqual([1, 2]);
    finish(2);
    await flush();
    finish(3);

    await expect(Promise.all([first, waiter, latecomer])).resolves.toEqual([1, 2, 3]);
    expect(peak()).toBe(1);
  });

  it('rejects with the task error and frees the slot for the next task', async () => {
    const limit = createConcurrencyLimit(1);
    const failing = limit(() => Promise.reject(new Error('project unreadable')));
    const next = limit(() => Promise.resolve('next ran'));

    await expect(failing).rejects.toThrow('project unreadable');
    await expect(next).resolves.toBe('next ran');
  });

  it.each([0, -1, 1.5, Number.NaN])('refuses a limit of %s', (value) => {
    expect(() => createConcurrencyLimit(value)).toThrow(RangeError);
  });
});
