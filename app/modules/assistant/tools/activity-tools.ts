import { buildActivityFilter, shapeAuditEvent, type ShapedActivityEvent } from './activity-query';
import { datumPost } from './api-helpers';
import { tool } from 'ai';
import { z } from 'zod';

interface ActivityToolDeps {
  accessToken: string;
}

const MAX_PAGES = 5;
const QUERY_DEADLINE_MS = 15_000;

export {
  buildActivityFilter,
  escapeCelString,
  shapeAuditEvent,
  type ActivityFilterInput,
  type ShapedActivityEvent,
} from './activity-query';

export function createActivityTools({ accessToken }: ActivityToolDeps) {
  return {
    queryActivityLogs: tool({
      description:
        'Query platform audit logs as a compact activity timeline (newest first).' +
        ' Defaults to human write operations (create/update/patch/delete) and excludes system: service accounts and get/list/watch noise.' +
        ' If hasMore is true, pass the returned cursor to fetch the next page — never treat a truncated page as complete.' +
        ' If a named user or event is missing, retry with hoursBack 72 then 168. Use 48 for "yesterday".' +
        ' User account creates are often performed by a service account — do not set user when looking for new accounts; use verb="create" and resourceType="users".' +
        ' Set includeReads or includeSystem only when the operator asks for reads, controllers, or all activity.',
      inputSchema: z.object({
        hoursBack: z
          .number()
          .int()
          .min(1)
          .max(720)
          .default(24)
          .describe(
            'How many hours back to search (default 24). Use 48 for "yesterday", 72 then 168 if the person or event is missing.'
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(50)
          .describe('Max number of timeline entries to return (default 50)'),
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor from a previous response. Pass this when hasMore is true.'),
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
        includeReads: z
          .boolean()
          .default(false)
          .describe('Include get/list/watch events. Default false (writes only).'),
        includeSystem: z
          .boolean()
          .default(false)
          .describe(
            'Include system: service accounts and controllers. Default false (humans only).'
          ),
      }),
      execute: async ({
        hoursBack,
        limit,
        cursor: inputCursor,
        user,
        resourceType,
        apiGroup,
        namespace,
        resourceName,
        verb,
        includeReads,
        includeSystem,
      }: {
        hoursBack: number;
        limit: number;
        cursor?: string;
        user?: string;
        resourceType?: string;
        apiGroup?: string;
        namespace?: string;
        resourceName?: string;
        verb?: string;
        includeReads: boolean;
        includeSystem: boolean;
      }) => {
        const now = new Date();
        const startTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000).toISOString();
        const endTime = now.toISOString();
        const filter = buildActivityFilter({
          user,
          resourceType,
          apiGroup,
          namespace,
          resourceName,
          verb,
          includeReads,
          includeSystem,
        });

        const started = Date.now();
        const events: ShapedActivityEvent[] = [];
        let cursor = inputCursor;
        let pages = 0;
        let nextCursor: string | undefined;

        while (events.length < limit && pages < MAX_PAGES) {
          if (pages > 0 && Date.now() - started >= QUERY_DEADLINE_MS) break;

          const body = {
            apiVersion: 'activity.miloapis.com/v1alpha1',
            kind: 'AuditLogQuery',
            metadata: { name: `query-${Date.now()}-${pages}` },
            spec: {
              startTime,
              endTime,
              limit: Math.min(limit - events.length, 100),
              filter,
              ...(cursor ? { continue: cursor } : {}),
            },
          };

          const result = await datumPost(
            '/apis/activity.miloapis.com/v1alpha1/auditlogqueries',
            body,
            accessToken
          );
          if (result.error) {
            if (pages === 0) return result;
            break;
          }

          const status = result?.status ?? {};
          const page = (status.results ?? []).map((event: Record<string, any>) =>
            shapeAuditEvent(event)
          );
          events.push(...page);
          pages += 1;
          nextCursor = status.continue || undefined;
          cursor = nextCursor;
          if (!nextCursor) break;
        }

        const truncated = events.slice(0, limit);
        const hasMore = !!nextCursor || events.length > limit;

        return {
          events: truncated,
          hasMore,
          ...(hasMore && nextCursor ? { cursor: nextCursor } : {}),
          window: `${hoursBack}h`,
          filters: {
            writesOnly: !includeReads && !verb,
            humansOnly: !includeSystem,
          },
        };
      },
    }),
  };
}
