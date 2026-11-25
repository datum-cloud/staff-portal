import { getAuthErrorRedirectUrl } from '@/modules/axios/auth-error-redirect';

/**
 * `fetch` for the staff API from the browser, with the axios client's rule for
 * a dead session: a 401 with code `AUTH_ERROR` sends the browser to re-auth,
 * returning to this page. The response is returned either way, so callers keep
 * their own error handling.
 */
export async function fetchWithReauth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status !== 401) return response;

  const data: unknown = await response
    .clone()
    .json()
    .catch(() => null);
  const target = getAuthErrorRedirectUrl({ status: response.status, data }, window.location);
  if (target) window.location.href = target;
  return response;
}
