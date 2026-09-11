import type { PromVectorSample } from './vm-query';

export interface ChainsawStepTiming {
  step: string;
  order: number;
  durationSeconds: number;
  passed: boolean | null;
  averageSeconds: number | null;
  sampleCount: number;
}

export interface ChainsawStepTimingResult {
  runTimestamp: number | null;
  totalDurationSeconds: number | null;
  steps: ChainsawStepTiming[];
}

const METRIC_DURATION = 'chainsaw_test_step_duration_seconds';
const METRIC_RESULT = 'chainsaw_test_step_result';
const METRIC_OFFSET = 'chainsaw_test_step_start_offset_seconds';

interface RawStepSample {
  step: string;
  duration?: number;
  passed?: boolean;
  offset?: number;
}

// Reads the combined {__name__=~"chainsaw_test_step_(duration_seconds|result|
// start_offset_seconds)", ...} query result, bucketed by step via __name__.
function parseThisRunSamples(samples: PromVectorSample[]): Map<string, RawStepSample> {
  const byStep = new Map<string, RawStepSample>();
  for (const s of samples) {
    const step = s.metric.step;
    if (!step) continue;
    const value = parseFloat(s.value[1]);
    if (!Number.isFinite(value)) continue;

    const entry = byStep.get(step) ?? { step };
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
    byStep.set(step, entry);
  }
  return byStep;
}

// Reads a single-metric query result (avg_over_time / count_over_time),
// keyed by the step label.
function parseByStep(samples: PromVectorSample[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of samples) {
    const step = s.metric.step;
    if (!step) continue;
    const value = parseFloat(s.value[1]);
    if (Number.isFinite(value)) out.set(step, value);
  }
  return out;
}

// Prometheus label sets are unordered, so execution order is recovered from
// chainsaw_test_step_start_offset_seconds's value rather than a label —
// falling back to name order only if that metric is somehow missing.
function buildStepTimings(
  thisRun: Map<string, RawStepSample>,
  averages: Map<string, number>,
  counts: Map<string, number>
): ChainsawStepTiming[] {
  const withDuration = [...thisRun.values()].filter((s) => s.duration !== undefined);
  const hasOffsets = withDuration.every((s) => s.offset !== undefined);

  const ordered = hasOffsets
    ? withDuration.sort((a, b) => a.offset! - b.offset!)
    : withDuration.sort((a, b) => a.step.localeCompare(b.step));

  return ordered.map((s, i) => ({
    step: s.step,
    order: hasOffsets ? s.offset! : i,
    durationSeconds: s.duration!,
    passed: s.passed ?? null,
    averageSeconds: averages.get(s.step) ?? null,
    sampleCount: Math.round(counts.get(s.step) ?? 0),
  }));
}

function runTimestampFrom(timestampSamples: PromVectorSample[]): number | null {
  // Every step's duration/result/offset series share the same $ts (the CI
  // push time publish-test-metrics stamped) — any one sample's timestamp is
  // the run's real timestamp.
  for (const s of timestampSamples) {
    const seconds = parseFloat(s.value[1]);
    if (Number.isFinite(seconds)) return Math.round(seconds * 1000);
  }
  return null;
}

// Pure combination of the four VM query results into the response shape —
// no MCP/network dependency, so this is cheaply testable on its own.
export function computeStepTiming(
  thisRunSamples: PromVectorSample[],
  timestampSamples: PromVectorSample[],
  averageSamples: PromVectorSample[],
  countSamples: PromVectorSample[]
): ChainsawStepTimingResult {
  const steps = buildStepTimings(
    parseThisRunSamples(thisRunSamples),
    parseByStep(averageSamples),
    parseByStep(countSamples)
  );

  const totalDurationSeconds =
    steps.length > 0
      ? Math.round(steps.reduce((sum, s) => sum + s.durationSeconds, 0) * 100) / 100
      : null;

  return { runTimestamp: runTimestampFrom(timestampSamples), totalDurationSeconds, steps };
}
