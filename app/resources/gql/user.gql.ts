import { runGqlQuery, type GqlResult } from '@/modules/graphql/client';
import type { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';

/**
 * GraphQL operation for the users list, backed by the gateway, plus the
 * resource's types. The gateway joins each user with their latest
 * FraudEvaluation, so the list gets fraud score/decision in one round-trip.
 */

/** Users list with each user's latest fraud evaluation joined. */
export const usersOp = (params: {
  limit?: number;
  cursor?: string;
  search?: string;
  platformAccess?: string;
}) =>
  runGqlQuery('StaffUsers', {
    users: [
      {
        limit: params.limit ?? null,
        cursor: params.cursor ?? null,
        search: params.search ?? null,
        platformAccess: params.platformAccess ?? null,
      },
      {
        items: {
          name: true,
          email: true,
          givenName: true,
          familyName: true,
          createdAt: true,
          avatarUrl: true,
          lastLoginProvider: true,
          platformAccess: true,
          fraudScore: true,
          fraudDecision: true,
          fraudEvaluatedAt: true,
        },
        continueToken: true,
      },
    ],
  });

/** The flat gateway user fields — the input `mapGqlUser` reshapes. */
export type GqlUserFields = NonNullable<
  NonNullable<GqlResult<typeof usersOp>['users']>['items']
>[number];

/**
 * A users-list row: the k8s `User` shape the table already reads
 * (metadata/spec/status) plus the gateway-joined fraud fields. `mapGqlUser`
 * reshapes the flat gateway fields into this — a transform, so it's hand-written.
 */
export type GqlUser = ComMiloapisIamV1Alpha1User & {
  fraudScore: string | null;
  fraudDecision: string | null;
  fraudEvaluatedAt: string | null;
};
