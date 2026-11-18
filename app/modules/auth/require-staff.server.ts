import { authenticator } from '@/modules/auth';
import { redirectToReauth } from '@/modules/auth/reauth.server';
import { userDetailQuery } from '@/resources/request/server';
import { userGroupMembershipsQuery } from '@/resources/request/server/group.request';
import { env } from '@/utils/config/env.server';
import { getLoginUrl, getRedirectToPath } from '@/utils/cookies';
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

  const isStaff = await isStaffMember(token, userId);
  if (!isStaff) {
    throw redirect('/error/unauthorized');
  }

  const user = await userDetailQuery(token, userId);
  return { user };
}

/**
 * Whether `userId` belongs to the configured staff group. Shared by the page
 * gate above and the API middleware so both decide membership the same way.
 *
 * A 401/403 from the membership lookup means the user can't list memberships,
 * so it counts as not staff. Other errors (network, 500) are rethrown so they
 * aren't silently swallowed.
 */
export async function isStaffMember(token: string, userId: string): Promise<boolean> {
  try {
    const memberships = await userGroupMembershipsQuery(token, userId);
    return memberships.some((m) => m.spec?.groupRef?.name === env.staffGroupName);
  } catch (error) {
    if (error instanceof Response && (error.status === 401 || error.status === 403)) {
      return false;
    }
    throw error;
  }
}
