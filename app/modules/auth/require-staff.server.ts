import { authenticator } from '@/modules/auth';
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
 * Single source of truth so the gate (and its Cypress bypass) can't drift
 * between layouts. The `.server` suffix keeps it out of the client bundle.
 */
export async function requireStaffUser(request: Request) {
  const isAuthenticated = await authenticator.isAuthenticated(request);
  if (!isAuthenticated) {
    throw redirect(getLoginUrl(getRedirectToPath(request.url)));
  }

  const isValid = await authenticator.isValidSession(request);
  if (!isValid) {
    throw redirect('/logout');
  }

  const session = await authenticator.getSession(request);
  const token = session?.accessToken ?? '';
  const userId = session?.sub ?? '';

  if (env.isCypress) {
    return { user: null };
  }

  let isStaff = false;
  try {
    const memberships = await userGroupMembershipsQuery(token, userId);
    isStaff = memberships.some((m) => m.spec?.groupRef?.name === env.staffGroupName);
  } catch (error) {
    // 401/403 means the user can't list memberships — treat as not staff.
    // Other errors (network, 500) surface so they aren't silently swallowed.
    if (error instanceof Response && (error.status === 401 || error.status === 403)) {
      isStaff = false;
    } else {
      throw error;
    }
  }
  if (!isStaff) {
    throw redirect('/error/unauthorized');
  }

  const user = await userDetailQuery(token, userId);
  return { user };
}
