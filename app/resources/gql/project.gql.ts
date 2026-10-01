import { runGqlQuery, type GqlResult } from '@/modules/graphql/client';

/**
 * GraphQL operations for the top-level projects list + detail, backed by the
 * gateway. The project field selection is intentionally repeated here (rather
 * than shared with `organization.gql.ts`) so each op reads as the full request
 * at a glance. The api layer maps the raw shape into `GqlProject`.
 */

/** Project list with owning-org + billing facets (Projects list table). */
export const projectsOp = (params: { limit?: number; cursor?: string; search?: string }) =>
  runGqlQuery('StaffProjects', {
    projects: [
      {
        limit: params.limit ?? null,
        cursor: params.cursor ?? null,
        search: params.search ?? null,
      },
      {
        items: {
          name: true,
          displayName: true,
          organizationName: true,
          organizationDisplayName: true,
          organizationBusinessName: true,
          hasActiveBillingAccount: true,
          billingAccountName: true,
          createdAt: true,
          state: true,
          deletionTimestamp: true,
          resourceCleanupMessage: true,
        },
        continueToken: true,
      },
    ],
  });

/** Single project (project detail header). */
export const projectOp = (name: string) =>
  runGqlQuery('StaffProject', {
    project: [
      { name },
      {
        name: true,
        displayName: true,
        organizationName: true,
        organizationDisplayName: true,
        organizationBusinessName: true,
        hasActiveBillingAccount: true,
        billingAccountName: true,
        createdAt: true,
        state: true,
        deletionTimestamp: true,
        resourceCleanupMessage: true,
      },
    ],
  });

/**
 * A project row — the gateway shape returned as-is (pass-through, no transform),
 * so the type is derived from the op's selection rather than re-declared.
 */
export type GqlProject = NonNullable<
  NonNullable<GqlResult<typeof projectsOp>['projects']>['items']
>[number];
