import type { Route } from './+types/callback';
import { authenticator } from '@/modules/auth';
import { requestIdContext } from '@/server/context';
import {
  getRedirectDestination,
  redirectToCookie,
  sessionCookie,
  tokenCookie,
} from '@/utils/cookies';
import { AuthenticationError } from '@/utils/errors';
import { combineHeaders } from '@/utils/helpers';
import logger from '@/utils/logger';
import { Trans } from '@lingui/react/macro';
import { redirect } from 'react-router';

export function meta({}: Route.MetaFunction) {
  return [
    { title: 'Datum - Staff Portal' },
    { name: 'description', content: 'Welcome to Datum - Staff Portal' },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  try {
    const credentials = await authenticator.authenticate('zitadel', request);
    if (!credentials) {
      throw new AuthenticationError('Authentication failed');
    }

    const session = await sessionCookie.set(request, {
      sub: credentials.sub,
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiredAt: credentials.expiredAt,
    });
    const token = await tokenCookie.set(request, {
      idToken: credentials.idToken,
    });

    // Redirect to originally requested page if stored in cookie
    const redirectTo = await redirectToCookie.parse(request.headers.get('Cookie') ?? '');
    const destination = getRedirectDestination(redirectTo);
    const clearRedirectCookie = await redirectToCookie.serialize('', { maxAge: 0 });

    return redirect(destination, {
      headers: combineHeaders(session.headers, token.headers, {
        'Set-Cookie': clearRedirectCookie,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const url = new URL(request.url);
    // Never log the Cookie header or the query string: they carry the session
    // tokens, the OAuth state and the one-time authorization code.
    logger.error('OAuth callback error', {
      error: message,
      url: `${url.origin}${url.pathname}`,
      hostname: url.hostname,
      protocol: url.protocol,
    });

    if (message.includes('Missing state on cookie')) {
      return redirect(
        `/error/oauth-error?error=missing_state&request_id=${context.get(requestIdContext)}`
      );
    }

    return redirect(
      `/error/oauth-error?error=oauth_failed&request_id=${context.get(requestIdContext)}`
    );
  }
}

export default function Callback() {
  return (
    <div>
      <Trans>Loading...</Trans>
    </div>
  );
}
