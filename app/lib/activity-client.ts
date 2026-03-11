/**
 * Create an Activity API client configured for staff portal.
 *
 * The client uses /api/internal as the base URL, which is the staff portal's
 * backend proxy. This proxy handles authentication and forwards requests to
 * the actual API servers.
 *
 * NOTE: This is used client-side - the token is not needed here because
 * the /api/internal proxy handles authentication via session cookies.
 *
 * The proxy wraps responses in {requestId, code, data, path} format,
 * so we use responseTransformer to extract the actual API response.
 *
 * @param controlPlanePath - Optional path to a tenant's control plane for scoped queries.
 *   Examples:
 *   - Organization: `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/{orgName}/control-plane`
 *   - Project: `/apis/resourcemanager.miloapis.com/v1alpha1/projects/{projectName}/control-plane`
 */
export function createActivityClientConfig(controlPlanePath?: string) {
  const baseUrl = controlPlanePath ? `/api/internal${controlPlanePath}` : '/api/internal';

  return {
    baseUrl,
    // No token needed - the proxy handles authentication via session cookies

    // The staff-portal proxy wraps API responses in {code, data, ...} format.
    // This transformer unwraps the response to get the actual API data.
    responseTransformer: (response: unknown) => {
      // Check if this is a wrapped response from the proxy
      if (response && typeof response === 'object' && 'data' in response && 'code' in response) {
        const wrapped = response as { code: string; data: unknown };
        // Return the unwrapped data
        return wrapped.data;
      }
      // Not wrapped, return as-is (for backwards compatibility)
      return response;
    },
  };
}

/**
 * Build the control plane path for an organization.
 */
export function getOrganizationControlPlanePath(organizationName: string): string {
  return `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${encodeURIComponent(organizationName)}/control-plane`;
}

/**
 * Build the control plane path for a project.
 */
export function getProjectControlPlanePath(projectName: string): string {
  return `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${encodeURIComponent(projectName)}/control-plane`;
}
