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
 *   - User: `/apis/iam.miloapis.com/v1alpha1/users/{userId}/control-plane`
 */
export function createActivityClientConfig(controlPlanePath?: string) {
  const baseUrl = controlPlanePath ? `/api/internal${controlPlanePath}` : '/api/internal';

  return {
    baseUrl,
    responseTransformer: (response: unknown) => {
      if (response && typeof response === 'object' && 'data' in response && 'code' in response) {
        const wrapped = response as { code: string; data: unknown };
        return wrapped.data;
      }
      return response;
    },
  };
}

export function getOrganizationControlPlanePath(organizationName: string): string {
  return `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${encodeURIComponent(organizationName)}/control-plane`;
}

export function getProjectControlPlanePath(projectName: string): string {
  return `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${encodeURIComponent(projectName)}/control-plane`;
}

export function getUserControlPlanePath(userId: string): string {
  return `/apis/iam.miloapis.com/v1alpha1/users/${encodeURIComponent(userId)}/control-plane`;
}
