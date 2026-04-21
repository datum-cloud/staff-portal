import { env } from '@/utils/config/env.server';
import { tool } from 'ai';
import { z } from 'zod';

async function sentryApi(path: string) {
  if (!env.sentryApiUrl || !env.sentryApiToken) {
    return { error: 'Sentry API is not configured' };
  }

  try {
    const res = await fetch(`${env.sentryApiUrl}/api/0/${path}`, {
      headers: {
        Authorization: `Bearer ${env.sentryApiToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { error: `Sentry API error: ${res.status} ${res.statusText}` };
    return res.json();
  } catch (err) {
    return { error: `Sentry request failed: ${err instanceof Error ? err.message : 'unknown'}` };
  }
}

function applyDefaults(query: string): string {
  let q = query;
  if (env.sentryEnvironment) q += ` environment:${env.sentryEnvironment}`;
  for (const slug of env.sentryExcludedProjects) q += ` !project:${slug}`;
  return q;
}

export function createSentryTools() {
  const org = env.sentryOrganization;

  return {
    listSentryIssues: tool({
      description:
        'List unresolved Sentry issues, optionally filtered by query or project.' +
        ' Call this when the operator asks about errors, exceptions, or Sentry issues.',
      inputSchema: z.object({
        query: z
          .string()
          .optional()
          .describe('Sentry search query (e.g. "is:unresolved", error message text, user email)'),
        project: z
          .string()
          .optional()
          .describe('Sentry project slug to filter by (e.g. "cloud-portal", "staff-portal")'),
        sortBy: z
          .enum(['date', 'new', 'freq', 'priority'])
          .default('date')
          .describe('Sort order (default: date)'),
        limit: z.number().int().min(1).max(25).default(10).describe('Max issues to return'),
      }),
      execute: async ({
        query,
        project,
        sortBy,
        limit,
      }: {
        query?: string;
        project?: string;
        sortBy: string;
        limit: number;
      }) => {
        const params = new URLSearchParams();
        params.set('query', applyDefaults(query ?? 'is:unresolved'));
        params.set('sort', sortBy);
        params.set('limit', String(limit));
        if (env.sentryEnvironment) params.set('environment', env.sentryEnvironment);
        if (project) params.set('project', project);

        const result = await sentryApi(`organizations/${org}/issues/?${params}`);
        if (result.error) return result;

        return {
          issues: Array.isArray(result)
            ? result.map((issue: any) => ({
                id: issue.id,
                shortId: issue.shortId,
                title: issue.title,
                culprit: issue.culprit,
                level: issue.level,
                count: issue.count,
                userCount: issue.userCount,
                firstSeen: issue.firstSeen,
                lastSeen: issue.lastSeen,
                project: issue.project?.slug,
                status: issue.status,
                permalink: issue.permalink,
              }))
            : [],
        };
      },
    }),

    getSentryIssue: tool({
      description:
        'Get detailed information about a specific Sentry issue including last event, tags, and frequency.',
      inputSchema: z.object({
        issueId: z.string().describe('The Sentry issue ID'),
      }),
      execute: async ({ issueId }: { issueId: string }) => {
        const [issue, latestEvent] = await Promise.all([
          sentryApi(`issues/${issueId}/`),
          sentryApi(`issues/${issueId}/events/latest/`),
        ]);
        if (issue.error) return issue;

        return {
          id: issue.id,
          shortId: issue.shortId,
          title: issue.title,
          culprit: issue.culprit,
          level: issue.level,
          count: issue.count,
          userCount: issue.userCount,
          firstSeen: issue.firstSeen,
          lastSeen: issue.lastSeen,
          project: issue.project?.slug,
          status: issue.status,
          type: issue.type,
          metadata: issue.metadata,
          tags: issue.tags?.slice(0, 10),
          permalink: issue.permalink,
          latestEventUser: latestEvent?.user
            ? {
                id: latestEvent.user.id,
                email: latestEvent.user.email,
                username: latestEvent.user.username,
                ipAddress: latestEvent.user.ip_address,
              }
            : undefined,
        };
      },
    }),

    listSentryEvents: tool({
      description:
        'List recent events (occurrences) for a specific Sentry issue.' +
        ' Use this to see recent stack traces and context for an error.',
      inputSchema: z.object({
        issueId: z.string().describe('The Sentry issue ID'),
        limit: z.number().int().min(1).max(10).default(5).describe('Max events to return'),
      }),
      execute: async ({ issueId, limit }: { issueId: string; limit: number }) => {
        const result = await sentryApi(`issues/${issueId}/events/?limit=${limit}`);
        if (result.error) return result;

        return {
          events: Array.isArray(result)
            ? result.map((event: any) => ({
                eventID: event.eventID,
                dateCreated: event.dateCreated,
                message: event.message || event.title,
                user: event.user
                  ? {
                      id: event.user.id,
                      email: event.user.email,
                      username: event.user.username,
                      ipAddress: event.user.ip_address,
                    }
                  : undefined,
                tags: event.tags?.slice(0, 8),
                contexts: event.contexts,
                entries: event.entries
                  ?.filter((e: any) => e.type === 'exception')
                  ?.map((e: any) => ({
                    type: e.type,
                    values: e.data?.values?.map((v: any) => ({
                      type: v.type,
                      value: v.value,
                      stacktrace: v.stacktrace?.frames?.slice(-5),
                    })),
                  })),
              }))
            : [],
        };
      },
    }),

    searchSentryErrors: tool({
      description:
        'Search for error events across all Sentry projects matching a query.' +
        ' Use this for broad error investigation across the platform.',
      inputSchema: z.object({
        query: z.string().describe('Search query (error message, user, URL, etc.)'),
        statsPeriod: z.string().default('24h').describe('Time range (e.g. "24h", "7d", "14d")'),
      }),
      execute: async ({ query, statsPeriod }: { query: string; statsPeriod: string }) => {
        const params = new URLSearchParams();
        params.set('query', applyDefaults(query));
        params.set('statsPeriod', statsPeriod);
        if (env.sentryEnvironment) params.set('environment', env.sentryEnvironment);
        params.set('field', 'title');
        params.set('field', 'count()');
        params.set('field', 'last_seen()');
        params.set('field', 'project');
        params.set('sort', '-count()');
        params.set('per_page', '15');

        const result = await sentryApi(`organizations/${org}/events/?${params}`);
        if (result.error) return result;

        return {
          events: result?.data ?? result,
          meta: result?.meta,
        };
      },
    }),
  };
}
