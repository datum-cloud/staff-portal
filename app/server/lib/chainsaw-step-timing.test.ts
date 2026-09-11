import { computeStepTiming } from './chainsaw-step-timing';
import type { PromVectorSample } from './vm-query';
import { describe, expect, test } from 'bun:test';

function sample(name: string, step: string, value: number): PromVectorSample {
  return { metric: { __name__: name, step }, value: [1_700_000_000, String(value)] };
}

describe('computeStepTiming', () => {
  test('orders steps by start offset, not by name', () => {
    const thisRun = [
      sample('chainsaw_test_step_duration_seconds', 'verify-dataplane', 75.5),
      sample('chainsaw_test_step_start_offset_seconds', 'verify-dataplane', 19),
      sample('chainsaw_test_step_duration_seconds', 'assert-derived-resources', 11),
      sample('chainsaw_test_step_start_offset_seconds', 'assert-derived-resources', 8),
      sample('chainsaw_test_step_duration_seconds', 'setup-kubeconfig', 2.35),
      sample('chainsaw_test_step_start_offset_seconds', 'setup-kubeconfig', 0),
    ];

    const result = computeStepTiming(thisRun, [], [], []);

    expect(result.steps.map((s) => s.step)).toEqual([
      'setup-kubeconfig',
      'assert-derived-resources',
      'verify-dataplane',
    ]);
  });

  test('joins averages and sample counts by step', () => {
    const thisRun = [sample('chainsaw_test_step_duration_seconds', 'create-proxy', 12.8)];
    const averages = [sample('chainsaw_test_step_duration_seconds', 'create-proxy', 8.1)];
    const counts = [sample('chainsaw_test_step_duration_seconds', 'create-proxy', 20)];

    const result = computeStepTiming(thisRun, [], averages, counts);

    expect(result.steps[0].averageSeconds).toBe(8.1);
    expect(result.steps[0].sampleCount).toBe(20);
  });

  test('missing average/count yields null average and zero sample count', () => {
    const thisRun = [sample('chainsaw_test_step_duration_seconds', 'setup-kubeconfig', 2.1)];

    const result = computeStepTiming(thisRun, [], [], []);

    expect(result.steps[0].averageSeconds).toBeNull();
    expect(result.steps[0].sampleCount).toBe(0);
  });

  test('a step present only in chainsaw_test_step_result (no duration) is dropped', () => {
    const thisRun = [sample('chainsaw_test_step_result', 'orphan', 1)];

    const result = computeStepTiming(thisRun, [], [], []);

    expect(result.steps).toEqual([]);
  });

  test('passed is null when the result metric is absent, not false', () => {
    const thisRun = [sample('chainsaw_test_step_duration_seconds', 'setup-kubeconfig', 2.1)];

    const result = computeStepTiming(thisRun, [], [], []);

    expect(result.steps[0].passed).toBeNull();
  });

  test('a failed step reports passed: false', () => {
    const thisRun = [
      sample('chainsaw_test_step_duration_seconds', 'assert-derived-resources', 30.1),
      sample('chainsaw_test_step_result', 'assert-derived-resources', 0),
    ];

    const result = computeStepTiming(thisRun, [], [], []);

    expect(result.steps[0].passed).toBe(false);
  });

  test('falls back to name order when offsets are missing for some steps', () => {
    const thisRun = [
      sample('chainsaw_test_step_duration_seconds', 'zeta', 1),
      sample('chainsaw_test_step_duration_seconds', 'alpha', 2),
    ];

    const result = computeStepTiming(thisRun, [], [], []);

    expect(result.steps.map((s) => s.step)).toEqual(['alpha', 'zeta']);
  });

  test('runTimestamp reads any sample from the timestamp query, in ms', () => {
    const timestamps = [
      sample('chainsaw_test_step_duration_seconds', 'setup-kubeconfig', 1_700_000_000),
    ];

    const result = computeStepTiming([], timestamps, [], []);

    expect(result.runTimestamp).toBe(1_700_000_000_000);
  });

  test('runTimestamp is null when nothing resolved', () => {
    expect(computeStepTiming([], [], [], []).runTimestamp).toBeNull();
  });

  test('totalDurationSeconds sums the steps, null when there are none', () => {
    const thisRun = [
      sample('chainsaw_test_step_duration_seconds', 'a', 2.35),
      sample('chainsaw_test_step_duration_seconds', 'b', 5.65),
    ];

    expect(computeStepTiming(thisRun, [], [], []).totalDurationSeconds).toBe(8);
    expect(computeStepTiming([], [], [], []).totalDurationSeconds).toBeNull();
  });
});
