import { runGqlQuery, type GqlResult } from '@/modules/graphql/client';

/**
 * GraphQL operations for organizations + their projects/members, backed by the
 * gateway, plus the resource's domain types. Each op declares its request (args
 * + field selection) inline and returns a result typed from that selection. The
 * api layer (`organization.api.ts`) calls these and, for organizations, maps the
 * raw gateway shape into `GqlOrganization`.
 */

export interface GqlOrgContactInfo {
  businessName: string | null;
  name: string | null;
  email: string | null;
}

/**
 * The UI's organization row — a *transform* of the gateway shape (adds derived
 * `onboardingStatus` / `entityType` / project counts), so it is hand-written
 * rather than derived; `mapGqlOrganization` in the api layer produces it.
 */
export interface GqlOrganization {
  name: string;
  displayName: string;
  type: string;
  createdAt: string | null;
  state: string | null;
  /** Company / legal name from org contact details. */
  contactInfo: GqlOrgContactInfo | null;
  /** True when status.conditions OnboardingComplete is True. */
  onboardingComplete: boolean;
  /** Derived list/filter label: Active when onboarded, else Inactive. */
  onboardingStatus: 'Active' | 'Inactive';
  /**
   * Company when `contactInfo.businessName` is set, otherwise Individual.
   * Used by the Type sidebar filter (not the legacy Personal/Standard field).
   */
  entityType: 'Company' | 'Individual';
  onboardingReason: string | null;
  onboardingMessage: string | null;
  /** Projects on the first page (limit 100). Only populated on detail queries. */
  projectCount: number;
  hasMoreProjects: boolean;
}

/** Organization list with company / onboarding facets (list table + Type filter). */
export const organizationsOp = (params: { limit?: number; cursor?: string; search?: string }) =>
  runGqlQuery('StaffOrganizations', {
    organizations: [
      {
        limit: params.limit ?? null,
        cursor: params.cursor ?? null,
        search: params.search ?? null,
      },
      {
        items: {
          name: true,
          displayName: true,
          type: true,
          createdAt: true,
          state: true,
          contactInfo: { businessName: true, name: true, email: true },
          onboardingComplete: true,
          onboardingReason: true,
          onboardingMessage: true,
        },
        continueToken: true,
      },
    ],
  });

/** Single organization + first page of project names (detail header + counts). */
export const organizationOp = (name: string) =>
  runGqlQuery('StaffOrganization', {
    organization: [
      { name },
      {
        name: true,
        displayName: true,
        type: true,
        createdAt: true,
        state: true,
        contactInfo: { businessName: true, name: true, email: true },
        onboardingComplete: true,
        onboardingReason: true,
        onboardingMessage: true,
        projects: [{ limit: 100 }, { items: { name: true }, continueToken: true }],
      },
    ],
  });

/** Projects owned by an organization (org detail → Projects tab). */
export const organizationProjectsOp = (
  orgName: string,
  params?: { limit?: number; cursor?: string }
) =>
  runGqlQuery('StaffOrgProjects', {
    organizationProjects: [
      { orgName, limit: params?.limit ?? null, cursor: params?.cursor ?? null },
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

/** Members + pending invitations of an organization (org detail → Members). */
export const organizationMembersOp = (orgName: string) =>
  runGqlQuery('StaffOrgMembers', {
    organizationMembers: [
      { orgName },
      {
        name: true,
        givenName: true,
        familyName: true,
        email: true,
        roles: true,
        type: true,
        invitationState: true,
        createdAt: true,
        userName: true,
        avatarUrl: true,
      },
    ],
  });

/**
 * An org member/invitation row — returned as-is (pass-through), so the type is
 * derived from the op's selection. Note `type` comes back as the gateway's
 * `string` rather than a `'member' | 'invitation'` literal union.
 */
export type GqlOrgMember = NonNullable<
  GqlResult<typeof organizationMembersOp>['organizationMembers']
>[number];
