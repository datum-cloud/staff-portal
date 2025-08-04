import { apiRequestClient } from '@/modules/axios/axios.client';
import { ListQueryParams, MemberListResponseSchema, MembershipFilters } from '@/resources/schemas';

// Helper function to build field selectors (Kubernetes API style)
export const buildFieldSelector = (selectors: Record<string, string>): string => {
  return Object.entries(selectors)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
};

/**
 * Query organization members with field selector support
 *
 * Field selectors follow Kubernetes API conventions:
 * - Filter by organization: spec.organizationRef.name=org-name
 * - Filter by user: spec.userRef.name=user-name
 * - Filter by organization type: status.organization.type=Personal
 * - Multiple selectors: status.organization.type=Personal,spec.userRef.name=john
 *
 * Examples:
 * ```typescript
 * // Get all members of an organization
 * orgMemberListQuery('my-org')
 *
 * // Get members of personal organizations only
 * orgMemberListQuery('my-org', {
 *   filters: { fieldSelector: 'status.organization.type=Personal' }
 * })
 *
 * // Get specific user's membership
 * orgMemberListQuery('my-org', {
 *   filters: { fieldSelector: 'spec.userRef.name=john.doe' }
 * })
 *
 * // Multiple field selectors
 * orgMemberListQuery('my-org', {
 *   filters: { fieldSelector: 'status.organization.type=Personal,spec.userRef.name=john.doe' }
 * })
 * ```
 */
export const orgMemberListQuery = (
  orgName: string,
  params?: ListQueryParams<MembershipFilters>
) => {
  // Build field selectors
  const fieldSelectors: Record<string, string> = {};

  // Always filter by organization
  fieldSelectors['spec.organizationRef.name'] = orgName;

  // Add additional field selectors from params
  if (params?.filters?.fieldSelector) {
    const additionalSelectors = params.filters.fieldSelector.split(',');
    additionalSelectors.forEach((selector: string) => {
      const [key, value] = selector.split('=');
      if (key && value) {
        fieldSelectors[key.trim()] = value.trim();
      }
    });
  }

  const fieldSelectorString =
    Object.keys(fieldSelectors).length > 0 ? buildFieldSelector(fieldSelectors) : undefined;

  return apiRequestClient({
    method: 'GET',
    url: '/apis/resourcemanager.miloapis.com/v1alpha1/organizationmemberships',
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      ...(fieldSelectorString && { fieldSelector: fieldSelectorString }),
    },
  })
    .output(MemberListResponseSchema)
    .execute();
};

/**
 * Query organizations that a user belongs to
 *
 * Examples:
 * ```typescript
 * // Get all organizations a user belongs to
 * userOrgListQuery('329866066916279575')
 *
 * // Get personal organizations only
 * userOrgListQuery('329866066916279575', {
 *   filters: { fieldSelector: 'status.organization.type=Personal' }
 * })
 *
 * // Get business organizations only
 * userOrgListQuery('329866066916279575', {
 *   filters: { fieldSelector: 'status.organization.type=Business' }
 * })
 * ```
 */
export const userOrgListQuery = (userName: string, params?: ListQueryParams<MembershipFilters>) => {
  // Build field selectors
  const fieldSelectors: Record<string, string> = {};

  // Always filter by user
  fieldSelectors['spec.userRef.name'] = userName;

  // Add additional field selectors from params
  if (params?.filters?.fieldSelector) {
    const additionalSelectors = params.filters.fieldSelector.split(',');
    additionalSelectors.forEach((selector: string) => {
      const [key, value] = selector.split('=');
      if (key && value) {
        fieldSelectors[key.trim()] = value.trim();
      }
    });
  }

  const fieldSelectorString =
    Object.keys(fieldSelectors).length > 0 ? buildFieldSelector(fieldSelectors) : undefined;

  return apiRequestClient({
    method: 'GET',
    url: '/apis/resourcemanager.miloapis.com/v1alpha1/organizationmemberships',
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      ...(fieldSelectorString && { fieldSelector: fieldSelectorString }),
    },
  })
    .output(MemberListResponseSchema)
    .execute();
};
