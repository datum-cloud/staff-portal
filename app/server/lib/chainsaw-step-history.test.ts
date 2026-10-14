import { computeStepHistory } from './chainsaw-step-history';
import type { PromMatrixSeries } from './vm-query';
import { describe, expect, test } from 'bun:test';

const RUN_1 = 1_700_000_000;
const RUN_2 = 1_700_003_600;
const RUN_3 = 1_700_007_200;

// Synthetic test/step names throughout — nothing here should resemble a real
// tests/construct/* test.
function series(name: string, step: string, points: [number, number][]): PromMatrixSeries {
  return {
    metric: { __name__: name, step, test: 'fixture-test', suite: 'fixture-suite' },
    values: points.map(([ts, v]) => [ts, String(v)]),
  };
}

const duration = (step: string, points: [number, number][]) =>
  series('chainsaw_test_step_duration_seconds', step, points);
const result = (step: string, points: [number, number][]) =>
  series('chainsaw_test_step_result', step, points);
const offset = (step: string, points: [number, number][]) =>
  series('chainsaw_test_step_start_offset_seconds', step, points);

function runResult(points: [number, number][], stability = 'stable'): PromMatrixSeries {
  return {
    metric: { __name__: 'chainsaw_test_result', test: 'fixture-test', stability },
    values: points.map(([ts, v]) => [ts, String(v)]),
  };
}

describe('computeStepHistory', () => {
  test('groups samples into one run per shared timestamp, oldest first', () => {
    const steps = [
      duration('step-alpha', [
        [RUN_2, 3],
        [RUN_1, 2],
      ]),
      duration('step-beta', [
        [RUN_1, 10],
        [RUN_2, 12.5],
      ]),
      result('step-alpha', [
        [RUN_1, 1],
        [RUN_2, 1],
      ]),
      result('step-beta', [
        [RUN_1, 1],
        [RUN_2, 0],
      ]),
    ];
    const runs = [
      runResult([
        [RUN_1, 1],
        [RUN_2, 0],
      ]),
    ];

    const history = computeStepHistory(steps, runs);

    expect(history.runs).toEqual([
      {
        timestamp: RUN_1 * 1000,
        passed: true,
        totalDurationSeconds: 12,
        steps: {
          'step-alpha': { durationSeconds: 2, passed: true },
          'step-beta': { durationSeconds: 10, passed: true },
        },
      },
      {
        timestamp: RUN_2 * 1000,
        passed: false,
        totalDurationSeconds: 15.5,
        steps: {
          'step-alpha': { durationSeconds: 3, passed: true },
          'step-beta': { durationSeconds: 12.5, passed: false },
        },
      },
    ]);
  });

  test('orders steps by start offset, not by name', () => {
    const steps = [
      duration('zz-first', [[RUN_1, 1]]),
      offset('zz-first', [[RUN_1, 0]]),
      duration('aa-second', [[RUN_1, 1]]),
      offset('aa-second', [[RUN_1, 5]]),
    ];

    expect(computeStepHistory(steps, []).steps).toEqual(['zz-first', 'aa-second']);
  });

  test('a run that failed early only carries the steps it reached', () => {
    const steps = [
      duration('step-alpha', [
        [RUN_1, 2],
        [RUN_2, 2],
      ]),
      duration('step-beta', [[RUN_1, 10]]),
      offset('step-alpha', [
        [RUN_1, 0],
        [RUN_2, 0],
      ]),
      offset('step-beta', [[RUN_1, 2]]),
    ];
    const runs = [
      runResult([
        [RUN_1, 1],
        [RUN_2, 0],
      ]),
    ];

    const history = computeStepHistory(steps, runs);

    expect(history.steps).toEqual(['step-alpha', 'step-beta']);
    expect(Object.keys(history.runs[1].steps)).toEqual(['step-alpha']);
    expect(history.runs[1].passed).toBe(false);
    expect(history.runs[1].totalDurationSeconds).toBe(2);
  });

  test('a step renamed partway through the window keeps both names, ordered by latest offset', () => {
    // RUN_1 used "old-verify" as its last step; RUN_2 and RUN_3 renamed it to
    // "new-verify" and inserted "new-middle" ahead of it.
    const steps = [
      duration('setup', [
        [RUN_1, 1],
        [RUN_2, 1],
        [RUN_3, 1],
      ]),
      offset('setup', [
        [RUN_1, 0],
        [RUN_2, 0],
        [RUN_3, 0],
      ]),
      duration('old-verify', [[RUN_1, 20]]),
      offset('old-verify', [[RUN_1, 1]]),
      duration('new-middle', [
        [RUN_2, 4],
        [RUN_3, 4],
      ]),
      offset('new-middle', [
        [RUN_2, 1],
        [RUN_3, 1],
      ]),
      duration('new-verify', [
        [RUN_2, 18],
        [RUN_3, 19],
      ]),
      offset('new-verify', [
        [RUN_2, 5],
        [RUN_3, 5],
      ]),
    ];

    const history = computeStepHistory(steps, []);

    expect(history.steps).toEqual(['setup', 'new-middle', 'old-verify', 'new-verify']);
    expect(Object.keys(history.runs[0].steps).sort()).toEqual(['old-verify', 'setup']);
    expect(Object.keys(history.runs[2].steps).sort()).toEqual([
      'new-middle',
      'new-verify',
      'setup',
    ]);
  });

  test('falls back to name order when any step has no offset', () => {
    const steps = [
      duration('zeta', [[RUN_1, 1]]),
      offset('zeta', [[RUN_1, 0]]),
      duration('alpha', [[RUN_1, 1]]),
    ];

    expect(computeStepHistory(steps, []).steps).toEqual(['alpha', 'zeta']);
  });

  test('passed is null when a result metric is absent, not false', () => {
    const history = computeStepHistory([duration('step-alpha', [[RUN_1, 2]])], []);

    expect(history.runs[0].passed).toBeNull();
    expect(history.runs[0].steps['step-alpha'].passed).toBeNull();
  });

  test('run-level results are folded across series (e.g. a stability label change)', () => {
    const steps = [
      duration('step-alpha', [
        [RUN_1, 2],
        [RUN_2, 2],
      ]),
    ];
    const runs = [runResult([[RUN_1, 0]], 'experimental'), runResult([[RUN_2, 1]], 'stable')];

    const history = computeStepHistory(steps, runs);

    expect(history.runs.map((r) => r.passed)).toEqual([false, true]);
  });

  test('runs with a result but no step durations are left out', () => {
    const steps = [duration('step-alpha', [[RUN_2, 2]]), result('step-alpha', [[RUN_1, 1]])];
    const runs = [
      runResult([
        [RUN_1, 1],
        [RUN_2, 1],
      ]),
    ];

    const history = computeStepHistory(steps, runs);

    expect(history.runs.map((r) => r.timestamp)).toEqual([RUN_2 * 1000]);
  });

  test('joins on ms-rounded timestamps, tolerating float seconds from VM', () => {
    const steps = [duration('step-alpha', [[1_700_000_000.123, 2]])];
    const runs = [runResult([[1_700_000_000.1230001, 1]])];

    const history = computeStepHistory(steps, runs);

    expect(history.runs[0].timestamp).toBe(1_700_000_000_123);
    expect(history.runs[0].passed).toBe(true);
  });

  test('skips non-numeric values and series without a step label', () => {
    const steps: PromMatrixSeries[] = [
      { metric: { __name__: 'chainsaw_test_step_duration_seconds' }, values: [[RUN_1, '5']] },
      {
        metric: { __name__: 'chainsaw_test_step_duration_seconds', step: 'x' },
        values: [[RUN_1, 'NaN']],
      },
    ];

    expect(computeStepHistory(steps, [])).toEqual({ steps: [], runs: [] });
  });

  test('empty results yield no steps and no runs', () => {
    expect(computeStepHistory([], [])).toEqual({ steps: [], runs: [] });
  });
});
