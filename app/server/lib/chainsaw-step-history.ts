import type { PromMatrixSeries } from './vm-query';

export interface ChainsawStepHistoryStep {
  durationSeconds: number;
  passed: boolean | null;
}

export interface ChainsawStepHistoryRun {
  timestamp: number;
  passed: boolean | null;
  totalDurationSeconds: number;
  steps: Record<string, ChainsawStepHistoryStep>;
}

export interface ChainsawStepHistoryResult {
  steps: string[];
  runs: ChainsawStepHistoryRun[];
}

const METRIC_DURATION = 'chainsaw_test_step_duration_seconds';
const METRIC_RESULT = 'chainsaw_test_step_result';
const METRIC_OFFSET = 'chainsaw_test_step_start_offset_seconds';

interface RawStepSample {
  duration?: number;
  passed?: boolean;
  offset?: number;
}

// publish-test-metrics stamps every series in one push with the report's
// endTime, so a run's step samples and its chainsaw_test_result sample all
// share one timestamp — that timestamp is the run's identity. VM returns it
// in float seconds; rounding to ms makes it an exact join key.
function runKey(seconds: number): number {
  return Math.round(seconds * 1000);
}

// Reads the raw [Nd] range-selector result over the three step metrics into
// run timestamp -> step -> sample, bucketed by step via __name__.
function parseStepSeries(series: PromMatrixSeries[]): Map<number, Map<string, RawStepSample>> {
  const byRun = new Map<number, Map<string, RawStepSample>>();
  for (const s of series) {
    const step = s.metric.step;
    if (!step) continue;
    for (const [seconds, raw] of s.values) {
      const value = parseFloat(raw);
      if (!Number.isFinite(value)) continue;

      const timestamp = runKey(seconds);
      const steps = byRun.get(timestamp) ?? new Map<string, RawStepSample>();
      const entry = steps.get(step) ?? {};
      switch (s.metric.__name__) {
        case METRIC_DURATION:
          entry.duration = value;
          break;
        case METRIC_RESULT:
          entry.passed = value === 1;
          break;
        case METRIC_OFFSET:
          entry.offset = value;
          break;
      }
      steps.set(step, entry);
      byRun.set(timestamp, steps);
    }
  }
  return byRun;
}

// chainsaw_test_result can span more than one series over a long window (e.g.
// a test's stability label changed), so every series is folded into a single
// run timestamp -> passed map.
function parseRunResults(series: PromMatrixSeries[]): Map<number, boolean> {
  const out = new Map<number, boolean>();
  for (const s of series) {
    for (const [seconds, raw] of s.values) {
      const value = parseFloat(raw);
      if (Number.isFinite(value)) out.set(runKey(seconds), value === 1);
    }
  }
  return out;
}

// Steps can be renamed, added or removed partway through a window, so the
// order comes from each step's offset in the most recent run it appears in
// (runs are walked newest first). Falls back to name order if any step never
// reported an offset — same fallback as computeStepTiming.
function orderSteps(runs: [number, Map<string, RawStepSample>][]): string[] {
  const latestOffset = new Map<string, number | undefined>();
  for (const [, steps] of [...runs].sort(([a], [b]) => b - a)) {
    for (const [step, sample] of steps) {
      if (sample.duration === undefined) continue;
      if (latestOffset.get(step) === undefined) latestOffset.set(step, sample.offset);
    }
  }

  const names = [...latestOffset.keys()];
  const hasOffsets = names.every((step) => latestOffset.get(step) !== undefined);
  return hasOffsets
    ? names.sort((a, b) => latestOffset.get(a)! - latestOffset.get(b)! || a.localeCompare(b))
    : names.sort((a, b) => a.localeCompare(b));
}

// Pure combination of the two VM query results into the response shape — no
// MCP/network dependency, so this is cheaply testable on its own. A run only
// appears if at least one named step reported a duration: runs from before a
// test named its steps (or with no step data at all) have nothing to plot.
export function computeStepHistory(
  stepSeries: PromMatrixSeries[],
  resultSeries: PromMatrixSeries[]
): ChainsawStepHistoryResult {
  const byRun = [...parseStepSeries(stepSeries)];
  const runResults = parseRunResults(resultSeries);

  const runs: ChainsawStepHistoryRun[] = byRun
    .map(([timestamp, rawSteps]) => {
      const steps: Record<string, ChainsawStepHistoryStep> = {};
      for (const [step, sample] of rawSteps) {
        if (sample.duration === undefined) continue;
        steps[step] = { durationSeconds: sample.duration, passed: sample.passed ?? null };
      }
      const total = Object.values(steps).reduce((sum, s) => sum + s.durationSeconds, 0);
      return {
        timestamp,
        passed: runResults.get(timestamp) ?? null,
        totalDurationSeconds: Math.round(total * 100) / 100,
        steps,
      };
    })
    .filter((run) => Object.keys(run.steps).length > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  return { steps: orderSteps(byRun), runs };
}
