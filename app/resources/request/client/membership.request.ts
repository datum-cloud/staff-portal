import { ListQueryParams, MembershipFilters } from '@/resources/schemas';
import { listResourcemanagerMiloapisComV1Alpha1OrganizationMembershipForAllNamespaces } from '@openapi/resourcemanager.miloapis.com/v1alpha1';

// Helper function to build field selectors (Kubernetes API style)
export const buildFieldSelector = (selectors: Record<string, string>): string => {
  return Object.entries(selectors)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
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
export const userOrgListQuery = async (
  userName: string,
  params?: ListQueryParams<MembershipFilters>
) => {
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

  const response =
    await listResourcemanagerMiloapisComV1Alpha1OrganizationMembershipForAllNamespaces({
      query: {
        limit: params?.limit,
        continue: params?.cursor,
        ...(fieldSelectorString && { fieldSelector: fieldSelectorString }),
      },
    });
  return response.data.data;
};
