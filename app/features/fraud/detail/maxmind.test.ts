import {
  extractMaxmindInsights,
  getMaxmindTransactionId,
  parseMaxmindRawResponse,
} from './maxmind';
import type { FraudEvaluation } from './types';
import { describe, expect, test } from 'vitest';

const SAMPLE_RAW = JSON.stringify({
  email: {
    domain: {
      first_seen: '2023-09-07',
      classification: 'business',
      volume: 0.091,
      visit: {
        status: 'live',
        last_visited_on: '2026-04-13',
        has_redirect: true,
      },
    },
    first_seen: '2025-12-04',
    is_disposable: false,
    is_free: false,
    is_high_risk: false,
  },
  ip_address: {
    risk: 0.01,
    country: { iso_code: 'US', names: { en: 'United States' } },
    location: {
      latitude: 36.3403,
      longitude: -86.7195,
      time_zone: 'America/Chicago',
      local_time: '2026-04-27T15:45:34-05:00',
    },
    city: { names: { en: 'Goodlettsville' } },
    postal: { code: '37072' },
    subdivisions: [{ iso_code: 'TN', names: { en: 'Tennessee' } }],
    traits: {
      autonomous_system_number: 7018,
      autonomous_system_organization: 'AT&T Enterprises, LLC',
      connection_type: 'Cable/DSL',
      domain: 'sbcglobal.net',
      isp: 'AT&T Internet',
      organization: 'AT&T Internet',
      ip_address: '162.233.226.65',
      network: '162.233.226.64/26',
      user_type: 'residential',
      static_ip_score: 60.8,
    },
  },
  id: '6f55918d-3935-4525-a900-3ac3cd5201eb',
  risk_score: 0.12,
  funds_remaining: 3.955,
  queries_remaining: 197,
});

function buildEvaluation(
  stageResults: NonNullable<FraudEvaluation['status']>['stageResults']
): FraudEvaluation {
  return {
    apiVersion: 'fraud.miloapis.com/v1alpha1',
    kind: 'FraudEvaluation',
    metadata: { name: 'eval-1' },
    spec: {
      userRef: { name: 'user-1' },
      policyRef: { name: 'policy-1' },
    },
    status: {
      stageResults,
    },
  } as FraudEvaluation;
}

describe('parseMaxmindRawResponse', () => {
  test('returns null for undefined input', () => {
    expect(parseMaxmindRawResponse(undefined)).toBeNull();
  });

  test('returns null for invalid JSON instead of throwing', () => {
    expect(parseMaxmindRawResponse('{not json')).toBeNull();
  });

  test('parses a valid response into a typed shape', () => {
    const parsed = parseMaxmindRawResponse(SAMPLE_RAW);
    expect(parsed?.id).toBe('6f55918d-3935-4525-a900-3ac3cd5201eb');
    expect(parsed?.ip_address?.traits?.ip_address).toBe('162.233.226.65');
    expect(parsed?.email?.domain?.classification).toBe('business');
  });

  test('returns null for non-object JSON (e.g. a bare string)', () => {
    expect(parseMaxmindRawResponse('"hello"')).toBeNull();
  });
});

describe('extractMaxmindInsights', () => {
  test('returns null when evaluation is undefined', () => {
    expect(extractMaxmindInsights(undefined)).toBeNull();
  });

  test('returns null when evaluation has no stage results', () => {
    expect(extractMaxmindInsights(buildEvaluation([]))).toBeNull();
  });

  test('extracts the maxmind raw response when present', () => {
    const evaluation = buildEvaluation([
      {
        name: 'identity',
        skipped: false,
        providerResults: [{ provider: 'maxmind', score: '12', rawResponse: SAMPLE_RAW }],
      },
    ]);
    const insights = extractMaxmindInsights(evaluation);
    expect(insights?.ip_address?.traits?.isp).toBe('AT&T Internet');
    expect(insights?.email?.first_seen).toBe('2025-12-04');
  });

  test('skips maxmind results that errored', () => {
    const evaluation = buildEvaluation([
      {
        name: 'identity',
        skipped: false,
        providerResults: [
          { provider: 'maxmind', score: '0', rawResponse: SAMPLE_RAW, error: 'timeout' },
        ],
      },
    ]);
    expect(extractMaxmindInsights(evaluation)).toBeNull();
  });

  test('skips maxmind results that fell back to a failure policy', () => {
    const evaluation = buildEvaluation([
      {
        name: 'identity',
        skipped: false,
        providerResults: [
          {
            provider: 'maxmind',
            score: '0',
            rawResponse: SAMPLE_RAW,
            failurePolicyApplied: 'FailOpen',
          },
        ],
      },
    ]);
    expect(extractMaxmindInsights(evaluation)).toBeNull();
  });

  test('skips skipped stages and ignores non-maxmind providers', () => {
    const evaluation = buildEvaluation([
      {
        name: 'pre-check',
        skipped: true,
        providerResults: [],
      },
      {
        name: 'identity',
        skipped: false,
        providerResults: [
          { provider: 'sift', score: '10', rawResponse: '{"foo":"bar"}' },
          { provider: 'maxmind', score: '12', rawResponse: SAMPLE_RAW },
        ],
      },
    ]);
    const insights = extractMaxmindInsights(evaluation);
    expect(insights?.id).toBe('6f55918d-3935-4525-a900-3ac3cd5201eb');
  });

  test('returns the latest maxmind result when more than one is present', () => {
    const evaluation = buildEvaluation([
      {
        name: 'first',
        skipped: false,
        providerResults: [
          {
            provider: 'maxmind',
            score: '5',
            rawResponse: JSON.stringify({
              id: 'older',
              ip_address: { traits: { isp: 'Old ISP' } },
            }),
          },
        ],
      },
      {
        name: 'second',
        skipped: false,
        providerResults: [
          {
            provider: 'maxmind',
            score: '12',
            rawResponse: JSON.stringify({
              id: 'newer',
              ip_address: { traits: { isp: 'New ISP' } },
            }),
          },
        ],
      },
    ]);
    const insights = extractMaxmindInsights(evaluation);
    expect(insights?.id).toBe('newer');
    expect(insights?.ip_address?.traits?.isp).toBe('New ISP');
  });
});

describe('getMaxmindTransactionId', () => {
  test('returns the id from insights', () => {
    expect(getMaxmindTransactionId({ id: 'tx-1' })).toBe('tx-1');
  });

  test('returns undefined for null insights', () => {
    expect(getMaxmindTransactionId(null)).toBeUndefined();
  });
});
