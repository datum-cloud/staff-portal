import { authenticator } from '@/modules/auth';
import { redirectToReauth } from '@/modules/auth/reauth.server';
import { userDetailQuery } from '@/resources/request/server';
import { userGroupMembershipsQuery } from '@/resources/request/server/group.request';
import { env } from '@/utils/config/env.server';
import { getLoginUrl, getRedirectToPath } from '@/utils/cookies';
import logger from '@/utils/logger';
import { redirect } from 'react-router';

/**
 * Authenticates the request and enforces staff-group membership for the private
 * layouts. Throws redirect Responses for the unauthenticated, invalid-session,
 * and non-staff cases; returns the resolved staff `user` on success.
 *
 * Under Cypress (E2E) the caller is a CI service account — not a human staff
 * user (no staff-group membership, no User record) — so the staff gate and the
 * user lookup are skipped. CYPRESS is never set in real environments; child
 * route loaders still fetch real data with the session token.
 *
 * `url` is the loader's normalized URL: v8 passes the raw `request`, whose URL
 * carries `.data` and `_routes` on client navigations.
 *
 * Single source of truth so the gate (and its Cypress bypass) can't drift
 * between layouts. The `.server` suffix keeps it out of the client bundle.
 */
export async function requireStaffUser(request: Request, url: URL) {
  const isAuthenticated = await authenticator.isAuthenticated(request);
  if (!isAuthenticated) {
    throw redirect(getLoginUrl(getRedirectToPath(url.href)));
  }

  // Expired session: restart login and come back to this page. Not /logout,
  // which is for the Sign out button and drops the saved URL.
  const isValid = await authenticator.isValidSession(request);
  if (!isValid) {
    throw await redirectToReauth(request, getRedirectToPath(url.href));
  }

  const session = await authenticator.getSession(request);
  const token = session?.accessToken ?? '';
  const userId = session?.sub ?? '';

  if (env.isCypress) {
    return { user: null };
  }

  const membership = await checkStaffMembership(token, userId);
  // The API refused the token although the cookie hasn't expired, so the
  // session is dead: sign in again instead of showing Access Denied.
  if (membership === 'token-rejected') {
    throw await redirectToReauth(request, getRedirectToPath(url.href));
  }
  if (membership === 'not-staff') {
    throw redirect('/error/unauthorized');
  }

  const user = await userDetailQuery(token, userId);
  return { user };
}

/**
 * - `staff`: a membership points at the configured staff group.
 * - `not-staff`: no such membership, or the lookup was forbidden (403).
 * - `token-rejected`: the API refused the access token (401), so the session
 *   is no longer usable, whatever its cookie says about expiry.
 */
export type StaffMembership = 'staff' | 'not-staff' | 'token-rejected';

/**
 * Whether `userId` belongs to the configured staff group. Shared by the page
 * gate above and the API middleware so both decide membership the same way.
 *
 * A 401 means the token was rejected and a 403 that the user may not list
 * memberships; they are reported apart because only the first is recovered by
 * signing in again. Other errors (network, 500) are rethrown so they aren't
 * silently swallowed.
 */
export async function checkStaffMembership(
  token: string,
  userId: string
): Promise<StaffMembership> {
  try {
    const memberships = await userGroupMembershipsQuery(token, userId);
    const isStaff = memberships.some((m) => m.spec?.groupRef?.name === env.staffGroupName);
    return isStaff ? 'staff' : 'not-staff';
  } catch (error) {
    if (error instanceof Response && error.status === 401) {
      logger.warn('Staff check: the API rejected the session token', { userId });
      return 'token-rejected';
    }
    if (error instanceof Response && error.status === 403) {
      logger.warn('Staff check: membership lookup forbidden', { userId });
      return 'not-staff';
    }
    throw error;
  }
}
