import { routes } from '@/utils/config/routes.config';

interface AuthErrorResponse {
  status: number;
  data?: unknown;
}

interface CurrentLocation {
  pathname: string;
  search: string;
}

/**
 * Returns where to send the browser when an API call fails because the session
 * expired (401 with code `AUTH_ERROR`), or `null` for any other error.
 *
 * The target is the re-auth route, which clears the stale cookies and restarts
 * login with the current page as `redirectTo`.
 */
export function getAuthErrorRedirectUrl(
  response: AuthErrorResponse | undefined,
  location: CurrentLocation
): string | null {
  if (response?.status !== 401) return null;

  const { data } = response;
  const code = typeof data === 'object' && data !== null ? (data as { code?: unknown }).code : null;
  if (code !== 'AUTH_ERROR') return null;

  return routes.reauth(location.pathname + location.search);
}
