import { ListQueryParams, MembershipFilters } from '@/resources/schemas';
import { listResourcemanagerMiloapisComV1Alpha1OrganizationMembershipForAllNamespaces } from '@openapi/resourcemanager.miloapis.com/v1alpha1';

export const buildFieldSelector = (selectors: Record<string, string>): string => {
  return Object.entries(selectors)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
};

export const userOrgListQuery = async (
  userName: string,
  params?: ListQueryParams<MembershipFilters>
) => {
  const fieldSelectors: Record<string, string> = {};
  fieldSelectors['spec.userRef.name'] = userName;

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
