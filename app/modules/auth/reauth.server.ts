import { routes } from '@/utils/config/routes.config';
import {
  clearReauthAttempt,
  getLoginUrl,
  hasRecentReauthAttempt,
  isValidRedirectPath,
  markReauthAttempt,
  sessionCookie,
  tokenCookie,
} from '@/utils/cookies';
import { combineHeaders } from '@/utils/helpers';
import logger from '@/utils/logger';
import { redirect } from 'react-router';

/**
 * Restarts login after the session or token expired.
 *
 * Clears the local session and token cookies, then redirects to `/login` with
 * `redirectTo` so the callback can return the user to the page they were
 * opening. Unlike `/logout`, it does not end the Zitadel session, so login
 * completes silently while the IdP session is still alive. An unsafe
 * `redirectTo` (absolute or protocol-relative) is dropped.
 *
 * Loop guard: a second re-auth within a minute means the previous silent login
 * produced a token the API rejected again. Instead of another silent login,
 * this sends the user to `/logout`, which ends the Zitadel session.
 */
export async function redirectToReauth(request: Request, redirectTo: string): Promise<Response> {
  // Leave the session and token cookies in place: logout reads the id token.
  if (await hasRecentReauthAttempt(request)) {
    logger.warn('Re-auth loop detected; signing out');
    return redirect(routes.logout(), {
      headers: { 'Set-Cookie': await clearReauthAttempt() },
    });
  }

  const token = await tokenCookie.destroy(request);
  const session = await sessionCookie.destroy(request);
  const target = isValidRedirectPath(redirectTo) ? redirectTo : '/';

  return redirect(getLoginUrl(target), {
    headers: combineHeaders(token.headers, session.headers, {
      'Set-Cookie': await markReauthAttempt(),
    }),
  });
}
