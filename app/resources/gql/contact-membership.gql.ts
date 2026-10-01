import { runGqlQuery } from '@/modules/graphql/client';

/**
 * GraphQL operations for contact ⇆ contact-group membership joins, backed by the
 * gateway. The api layer (`contact-membership.api.ts`) runs these and maps the
 * enriched rows into the k8s-shaped list types from `@/resources/schemas` — a
 * transform, so those return types stay hand-written there.
 */

type MembershipListParams = { fieldSelector?: string; limit?: number; cursor?: string };

/** Group → members, with each member's contact details joined. */
export const contactGroupMembershipsOp = (params?: MembershipListParams) =>
  runGqlQuery('StaffContactGroupMemberships', {
    contactGroupMembershipsWithContacts: [
      {
        ...(params?.fieldSelector && { fieldSelector: params.fieldSelector }),
        ...(params?.limit && { limit: params.limit }),
        ...(params?.cursor && { cursor: params.cursor }),
      },
      {
        continue: true,
        items: {
          name: true,
          contactRef: { name: true, namespace: true },
          contact: {
            name: true,
            namespace: true,
            email: true,
            givenName: true,
            familyName: true,
            displayName: true,
          },
        },
      },
    ],
  });

/** Contact → groups, with each group's details + conditions joined. */
export const contactMembershipsOp = (params?: MembershipListParams) =>
  runGqlQuery('StaffContactMemberships', {
    contactMembershipsWithGroups: [
      {
        ...(params?.fieldSelector && { fieldSelector: params.fieldSelector }),
        ...(params?.limit && { limit: params.limit }),
        ...(params?.cursor && { cursor: params.cursor }),
      },
      {
        continue: true,
        items: {
          name: true,
          creationTimestamp: true,
          contactGroupRef: { name: true, namespace: true },
          contactGroup: {
            name: true,
            namespace: true,
            displayName: true,
            visibility: true,
            status: {
              conditions: {
                type: true,
                status: true,
                reason: true,
                message: true,
                lastTransitionTime: true,
                observedGeneration: true,
              },
            },
          },
        },
      },
    ],
  });
