import { runGqlQuery, type GqlResult } from '@/modules/graphql/client';

/**
 * GraphQL operations for quota buckets + grants, backed by the gateway, plus the
 * resource's derived types. The gateway pre-joins AllowanceBuckets / ResourceGrants
 * with their ResourceRegistration (display names, owning service) so the Quotas
 * detail views take one round-trip. Each op is a pass-through — the api layer
 * returns the rows as-is — so the types are derived from the selections here.
 */

/** AllowanceBuckets consumed by an organization (org detail → Quotas usage). */
export const orgQuotaBucketsOp = (orgName: string) =>
  runGqlQuery('StaffOrgQuotaBuckets', {
    orgQuotaBuckets: [
      { orgName },
      {
        items: {
          name: true,
          namespace: true,
          resourceType: true,
          consumerKind: true,
          consumerName: true,
          consumerApiGroup: true,
          allocated: true,
          limit: true,
          available: true,
          displayName: true,
          description: true,
          registrationType: true,
          serviceOwner: true,
          serviceDisplayName: true,
        },
      },
    ],
  });

/** AllowanceBuckets consumed by a project (project detail → Quotas usage). */
export const projectQuotaBucketsOp = (projectName: string) =>
  runGqlQuery('StaffProjectQuotaBuckets', {
    projectQuotaBuckets: [
      { projectName },
      {
        items: {
          name: true,
          namespace: true,
          resourceType: true,
          consumerKind: true,
          consumerName: true,
          consumerApiGroup: true,
          allocated: true,
          limit: true,
          available: true,
          displayName: true,
          description: true,
          registrationType: true,
          serviceOwner: true,
          serviceDisplayName: true,
        },
      },
    ],
  });

/** ResourceGrants governing an organization (org detail → Quotas grants). */
export const orgQuotaGrantsOp = (orgName: string) =>
  runGqlQuery('StaffOrgQuotaGrants', {
    orgQuotaGrants: [
      { orgName },
      {
        items: {
          name: true,
          namespace: true,
          createdAt: true,
          autoCreated: true,
          allowances: {
            resourceType: true,
            displayName: true,
            serviceDisplayName: true,
            amount: true,
          },
          conditions: { type: true, status: true, message: true },
        },
      },
    ],
  });

/** ResourceGrants governing a project (project detail → Quotas grants). */
export const projectQuotaGrantsOp = (projectName: string) =>
  runGqlQuery('StaffProjectQuotaGrants', {
    projectQuotaGrants: [
      { projectName },
      {
        items: {
          name: true,
          namespace: true,
          createdAt: true,
          autoCreated: true,
          allowances: {
            resourceType: true,
            displayName: true,
            serviceDisplayName: true,
            amount: true,
          },
          conditions: { type: true, status: true, message: true },
        },
      },
    ],
  });

// Pass-through types derived from the ops above — single source of truth.
export type GqlQuotaBucketList = NonNullable<
  GqlResult<typeof orgQuotaBucketsOp>['orgQuotaBuckets']
>;
export type GqlQuotaBucket = NonNullable<GqlQuotaBucketList['items']>[number];
export type GqlQuotaGrantList = NonNullable<GqlResult<typeof orgQuotaGrantsOp>['orgQuotaGrants']>;
export type GqlQuotaGrant = NonNullable<GqlQuotaGrantList['items']>[number];
