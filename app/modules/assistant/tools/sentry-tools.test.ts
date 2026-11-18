import { isToolError } from './http';
import {
  createSentryTools,
  isSafeSentryPath,
  sentryIssueIdSchema,
  toIssuePathSegment,
} from './sentry-tools';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/config/env.server', () => ({
  env: {
    sentryApiUrl: 'https://sentry.example.test',
    sentryApiToken: 'test-token',
    sentryOrganization: 'datum',
    sentryExcludedProjects: [],
    sentryEnvironment: undefined,
  },
}));

const TRAVERSAL_ATTEMPTS = [
  '../../projects',
  '..',
  '123/../../organizations/datum/members',
  '123/events',
  '%2e%2e%2fprojects',
  '..%2F..%2Fprojects',
  '123?query=1',
  '123#fragment',
  '/123',
  ' 123',
  '123\n',
  '',
  'CLOUD-PORTAL-1A',
];

const toolCallOptions = { toolCallId: 'call-1', messages: [], context: {} };

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('sentryIssueIdSchema', () => {
  it('accepts a numeric issue id', () => {
    expect(sentryIssueIdSchema.safeParse('4509012345').success).toBe(true);
  });

  it.each(TRAVERSAL_ATTEMPTS)('rejects %j', (value) => {
    expect(sentryIssueIdSchema.safeParse(value).success).toBe(false);
  });

  it('rejects an id longer than 20 digits', () => {
    expect(sentryIssueIdSchema.safeParse('1'.repeat(21)).success).toBe(false);
  });
});

describe('toIssuePathSegment', () => {
  it('returns the id for a numeric issue id', () => {
    expect(toIssuePathSegment('42')).toBe('42');
  });

  it.each(TRAVERSAL_ATTEMPTS)('returns a tool error for %j', (value) => {
    expect(isToolError(toIssuePathSegment(value))).toBe(true);
  });

  it('returns a tool error for a non-string id', () => {
    expect(isToolError(toIssuePathSegment(42))).toBe(true);
  });
});

describe('isSafeSentryPath', () => {
  it('allows the paths the tools build', () => {
    expect(isSafeSentryPath('issues/42/')).toBe(true);
    expect(isSafeSentryPath('issues/42/events/latest/')).toBe(true);
    expect(isSafeSentryPath('organizations/datum/issues/?query=is%3Aunresolved+..')).toBe(true);
  });

  it('rejects dot segments, encoded dot segments and absolute paths', () => {
    expect(isSafeSentryPath('issues/../../projects/')).toBe(false);
    expect(isSafeSentryPath('issues/./42/')).toBe(false);
    expect(isSafeSentryPath('issues/%2e%2e/projects/')).toBe(false);
    expect(isSafeSentryPath('/projects/')).toBe(false);
    expect(isSafeSentryPath('issues\\..\\projects')).toBe(false);
    expect(isSafeSentryPath('issues/%E0%A4%A/')).toBe(false);
  });
});

describe('Sentry issue tools', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockImplementation(async () => okResponse({ id: '42', title: 'Boom' }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('getSentryIssue requests only the issue endpoints for a numeric id', async () => {
    const tools = createSentryTools();

    const result = await tools.getSentryIssue.execute!({ issueId: '42' }, toolCallOptions);

    expect(result).toMatchObject({ id: '42', title: 'Boom' });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://sentry.example.test/api/0/issues/42/',
      'https://sentry.example.test/api/0/issues/42/events/latest/',
    ]);
  });

  it.each(TRAVERSAL_ATTEMPTS)('getSentryIssue does not call Sentry for %j', async (issueId) => {
    const tools = createSentryTools();

    const result = await tools.getSentryIssue.execute!({ issueId }, toolCallOptions);

    expect(isToolError(result)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('listSentryEvents requests the events endpoint for a numeric id', async () => {
    fetchMock.mockImplementation(async () => okResponse([]));
    const tools = createSentryTools();

    const result = await tools.listSentryEvents.execute!(
      { issueId: '42', limit: 5 },
      toolCallOptions
    );

    expect(result).toEqual({ events: [] });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://sentry.example.test/api/0/issues/42/events/?limit=5',
    ]);
  });

  it.each(TRAVERSAL_ATTEMPTS)('listSentryEvents does not call Sentry for %j', async (issueId) => {
    const tools = createSentryTools();

    const result = await tools.listSentryEvents.execute!({ issueId, limit: 5 }, toolCallOptions);

    expect(isToolError(result)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
