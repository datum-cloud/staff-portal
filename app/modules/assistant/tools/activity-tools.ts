import { datumPost } from './api-helpers';
import { tool } from 'ai';
import { z } from 'zod';

interface ActivityToolDeps {
  accessToken: string;
}

export function createActivityTools({ accessToken }: ActivityToolDeps) {
  return {
    queryActivityLogs: tool({
      description:
        'Query recent audit/activity logs. Always queries at platform scope and uses CEL filters to narrow results.' +
        ' Shows who did what and when. Call this when the operator asks about recent changes or audit trail.',
      inputSchema: z.object({
        hoursBack: z
          .number()
          .int()
          .min(1)
          .max(720)
          .default(24)
          .describe('How many hours back to search (default 24)'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe('Max number of entries to return (default 20)'),
        user: z.string().optional().describe('Filter by username (e.g. "john@example.com")'),
        resourceType: z
          .string()
          .optional()
          .describe('Filter by resource type (e.g. "organizations", "projects", "users")'),
        apiGroup: z
          .string()
          .optional()
          .describe('Filter by API group (e.g. "resourcemanager.miloapis.com")'),
        namespace: z
          .string()
          .optional()
          .describe('Filter by namespace (usually an org or project name)'),
        resourceName: z.string().optional().describe('Filter by specific resource name'),
        verb: z
          .string()
          .optional()
          .describe('Filter by action verb (e.g. "create", "update", "delete")'),
      }),
      execute: async ({
        hoursBack,
        limit,
        user,
        resourceType,
        apiGroup,
        namespace,
        resourceName,
        verb,
      }: {
        hoursBack: number;
        limit: number;
        user?: string;
        resourceType?: string;
        apiGroup?: string;
        namespace?: string;
        resourceName?: string;
        verb?: string;
      }) => {
        const now = new Date();
        const start = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);

        const conditions: string[] = [`objectRef.apiGroup != 'activity.miloapis.com'`];
        if (user) conditions.push(`user.username == '${user}'`);
        if (resourceType) conditions.push(`objectRef.resource == '${resourceType}'`);
        if (apiGroup) conditions.push(`objectRef.apiGroup == '${apiGroup}'`);
        if (namespace) conditions.push(`objectRef.namespace == '${namespace}'`);
        if (resourceName) conditions.push(`objectRef.name == '${resourceName}'`);
        if (verb) conditions.push(`verb == '${verb}'`);

        const body = {
          apiVersion: 'activity.miloapis.com/v1alpha1',
          kind: 'AuditLogQuery',
          metadata: { name: `query-${Date.now()}` },
          spec: {
            startTime: start.toISOString(),
            endTime: now.toISOString(),
            limit,
            filter: conditions.join(' && '),
          },
        };

        const result = await datumPost(
          '/apis/activity.miloapis.com/v1alpha1/auditlogqueries',
          body,
          accessToken
        );
        if (result.error) return result;

        const status = result?.status ?? {};
        return {
          logs: (status.results ?? []).slice(0, limit),
          hasMore: !!status.continue,
          window: `${hoursBack}h`,
        };
      },
    }),
  };
}
