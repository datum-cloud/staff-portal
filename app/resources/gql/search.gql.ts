import { runGqlQuery } from '@/modules/graphql/client';

/**
 * GraphQL operation for resolving user resource names to their gateway
 * UserSummary (name / email / given / family). Used by the global search
 * enrichment and creator display-name lookups. The api layer returns the rows
 * as-is (pass-through), so the type is the op's inferred selection.
 */
export const userSummariesOp = (names: string[]) =>
  runGqlQuery('StaffUserSummaries', {
    userSummaries: [{ names }, { name: true, email: true, givenName: true, familyName: true }],
  });
