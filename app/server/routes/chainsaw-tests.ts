import { EnvVariables } from '@/server/iface';
import { computeStepTiming } from '@/server/lib/chainsaw-step-timing';
import { runVmInstantQuery, runVmRangeQuery, seriesKey } from '@/server/lib/vm-query';
import type { PromMatrixSeries, PromVectorSample } from '@/server/lib/vm-query';
import { logApiError, logApiSuccess } from '@/server/logger';
import { authMiddleware } from '@/server/middleware';
import { createErrorResponse, createSuccessResponse } from '@/server/response';
import { BadRequestError } from '@/utils/errors';
import { captureApiError, createRequestLogger } from '@/utils/logger';
import { Hono } from 'hono';
import { z } from 'zod';

export const chainsawTestsRoutes = new Hono<{ Variables: EnvVariables }>();

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
// Tightened from 1h: a coarser grid collapses more same-hour runs onto one
// tick. Now that history[].timestamp comes from timestamp_with_name (see
// pairRangeSeries below) rather than the grid point, whichever tick survives
// still carries its own real $ts — a coarse step only risks a missing tick,
// never a wrong one.
const LIST_STEP = '30m';
const DETAIL_LOOKBACK = '30m';
const DETAIL_WINDOW_PATTERN = /^\d+[hd]$/;
const DEFAULT_DETAIL_WINDOW = '7d';
const SAFE_LABEL = /^[A-Za-z0-9_.:-]{1,128}$/;
const GITHUB_ACTIONS_URL =
  'https://github.com/datum-cloud/infra/actions/workflows/run-e2e-tests.yaml';

interface ChainsawTestRun {
  timestamp: number;
  passed: boolean;
}

interface ChainsawTestRow {
  key: string;
  test: string;
  suite: string;
  environment: string;
  history: ChainsawTestRun[];
  latest: ChainsawTestRun | null;
  grafanaUrl: string;
  docsUrl: string;
}

function grafanaHost(environment: string): string {
  return environment === 'staging' ? 'grafana.staging.env.datum.net' : 'grafana.prod.env.datum.net';
}

function grafanaUrlFor(suite: string, test: string, environment: string): string {
  const host = grafanaHost(environment);
  return `https://${host}/d/chainsaw-e2e/chainsaw-e2e-tests?var-suite=${encodeURIComponent(suite)}&var-test=${encodeURIComponent(test)}`;
}

// Every construct test's README.md lives at this path by convention
// (see datum-cloud/infra's tests/README.md anatomy section) — the
// "Validates" / "Stability" / "Skips" writeup for that specific test.
function docsUrlFor(suite: string, test: string): string {
  return `https://github.com/datum-cloud/infra/blob/main/tests/construct/${encodeURIComponent(suite)}/${encodeURIComponent(test)}/README.md`;
}

// Joins a value range-query's series to the matching timestamp_with_name
// series (same label set, same grid) so each point can carry the real CI
// push time instead of the query_range grid point. Also dedupes consecutive
// grid points that resolve to the same underlying sample — the grid can
// repeat a run several times over its width.
function pairRangeSeries(
  values: PromMatrixSeries[],
  timestamps: PromMatrixSeries[]
): { metric: Record<string, string>; points: { timestamp: number; value: string }[] }[] {
  const timestampsByKey = new Map<string, PromMatrixSeries>();
  for (const s of timestamps) timestampsByKey.set(seriesKey(s.metric), s);

  return values.map((series) => {
    const tsSeries = timestampsByKey.get(seriesKey(series.metric));
    const points: { timestamp: number; value: string }[] = [];
    let lastTimestamp: number | null = null;

    series.values.forEach(([gridTs, value], i) => {
      const realSeconds = tsSeries ? parseFloat(tsSeries.values[i]?.[1] ?? '') : NaN;
      const timestamp = Number.isFinite(realSeconds)
        ? Math.round(realSeconds * 1000)
        : gridTs * 1000;
      if (timestamp === lastTimestamp) return;
      lastTimestamp = timestamp;
      points.push({ timestamp, value });
    });

    return { metric: series.metric, points };
  });
}

chainsawTestsRoutes.post('/', authMiddleware(), async (c) => {
  const startTime = performance.now();
  const reqLogger = createRequestLogger(c);
  const reqId = c.get('requestId');

  reqLogger.info('Chainsaw Tests API Request Started', {
    path: c.req.path,
    method: c.req.method,
  });

  try {
    const { getMcpClient } = await import('@/modules/assistant/tools/mcp-client');

    const client = await getMcpClient();
    if (!client) {
      throw new Error('MCP is not configured or unreachable');
    }

    const rangeOpts = {
      start: new Date(Date.now() - THREE_DAYS_MS).toISOString(),
      end: new Date().toISOString(),
      step: LIST_STEP,
    };

    // Only tests someone has explicitly vouched for as "expected to pass
    // every run" — an unlabeled test is excluded, not defaulted in. See
    // metadata.labels.stability on each tests/construct/**/chainsaw-test.yaml.
    const [values, timestamps] = await Promise.all([
      runVmRangeQuery(
        client,
        'last_over_time(chainsaw_test_result{stability="stable"}[30m])',
        rangeOpts
      ),
      runVmRangeQuery(
        client,
        'timestamp_with_name(chainsaw_test_result{stability="stable"}[30m])',
        rangeOpts
      ),
    ]);

    const tests: ChainsawTestRow[] = pairRangeSeries(values, timestamps)
      .map(({ metric, points }) => {
        const test = metric.test ?? 'unknown';
        const suite = metric.suite ?? 'unknown';
        const environment = metric.environment ?? 'unknown';
        const history: ChainsawTestRun[] = points
          .map(({ timestamp, value }) => ({ timestamp, passed: parseFloat(value) === 1 }))
          .sort((a, b) => a.timestamp - b.timestamp);

        return {
          key: `${suite}/${test}/${environment}`,
          test,
          suite,
          environment,
          history,
          latest: history.length > 0 ? history[history.length - 1] : null,
          grafanaUrl: grafanaUrlFor(suite, test, environment),
          docsUrl: docsUrlFor(suite, test),
        };
      })
      .sort((a, b) => a.test.localeCompare(b.test));

    const data = { tests, githubActionsUrl: GITHUB_ACTIONS_URL };

    const duration = Math.round(performance.now() - startTime);

    logApiSuccess(reqLogger, {
      path: c.req.path,
      method: c.req.method,
      duration,
    });

    return c.json(createSuccessResponse(reqId, data, c.req.path), 200, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);

    await logApiError(reqLogger, error, {
      path: c.req.path,
      method: c.req.method,
      duration,
    });

    if (error instanceof Error) {
      captureApiError(error, {
        url: c.req.path,
        method: c.req.method,
        requestId: reqId,
      });
    }

    const { response, status } = await createErrorResponse(reqId, error, '/chainsaw-tests');
    return c.json(response, status as any);
  }
});

const stepTimingRequestSchema = z.object({
  test: z.string().regex(SAFE_LABEL),
  suite: z.string().regex(SAFE_LABEL),
  environment: z.string().regex(SAFE_LABEL),
  timestamp: z
    .number()
    .int()
    .min(0)
    .max(Date.now() + 24 * 60 * 60 * 1000),
  window: z.string().regex(DETAIL_WINDOW_PATTERN).optional(),
});

chainsawTestsRoutes.post('/step-timing', authMiddleware(), async (c) => {
  const startTime = performance.now();
  const reqLogger = createRequestLogger(c);
  const reqId = c.get('requestId');

  reqLogger.info('Chainsaw Step Timing API Request Started', {
    path: c.req.path,
    method: c.req.method,
  });

  try {
    const parsed = stepTimingRequestSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.message, reqId);
    }
    const { test, suite, environment, timestamp } = parsed.data;
    const window = parsed.data.window ?? DEFAULT_DETAIL_WINDOW;

    const { getMcpClient } = await import('@/modules/assistant/tools/mcp-client');
    const client = await getMcpClient();
    if (!client) {
      throw new Error('MCP is not configured or unreachable');
    }

    const selector = `test="${test}",suite="${suite}",environment="${environment}"`;
    const allStepMetrics = `{__name__=~"chainsaw_test_step_(duration_seconds|result|start_offset_seconds)",${selector}}`;
    const durationSelector = `chainsaw_test_step_duration_seconds{${selector}}`;

    const [thisRunSamples, timestampSamples, averageSamples, countSamples] = await Promise.all([
      runVmInstantQuery(client, `last_over_time(${allStepMetrics}[${DETAIL_LOOKBACK}])`, {
        time: timestamp,
      }),
      runVmInstantQuery(client, `timestamp_with_name(${durationSelector}[${DETAIL_LOOKBACK}])`, {
        time: timestamp,
      }),
      runVmInstantQuery(client, `avg_over_time(${durationSelector}[${window}])`, {
        time: timestamp,
      }),
      runVmInstantQuery(client, `count_over_time(${durationSelector}[${window}])`, {
        time: timestamp,
      }),
    ]);

    const { runTimestamp, totalDurationSeconds, steps } = computeStepTiming(
      thisRunSamples as PromVectorSample[],
      timestampSamples as PromVectorSample[],
      averageSamples as PromVectorSample[],
      countSamples as PromVectorSample[]
    );

    const data = {
      key: `${suite}/${test}/${environment}`,
      test,
      suite,
      environment,
      requestedTimestamp: timestamp,
      runTimestamp,
      totalDurationSeconds,
      steps,
      grafanaUrl: grafanaUrlFor(suite, test, environment),
      docsUrl: docsUrlFor(suite, test),
    };

    const duration = Math.round(performance.now() - startTime);

    logApiSuccess(reqLogger, {
      path: c.req.path,
      method: c.req.method,
      duration,
    });

    return c.json(createSuccessResponse(reqId, data, c.req.path), 200, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);

    await logApiError(reqLogger, error, {
      path: c.req.path,
      method: c.req.method,
      duration,
    });

    if (error instanceof Error) {
      captureApiError(error, {
        url: c.req.path,
        method: c.req.method,
        requestId: reqId,
      });
    }

    const { response, status } = await createErrorResponse(
      reqId,
      error,
      '/chainsaw-tests/step-timing'
    );
    return c.json(response, status as any);
  }
});
