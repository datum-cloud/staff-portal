import type { Route } from './+types/callback';
import { authenticator } from '@/modules/auth';
import { sessionCookie, tokenCookie } from '@/utils/cookies';
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

    return redirect('/', {
      headers: combineHeaders(session.headers, token.headers),
    });
  } catch (error) {
    logger.error('OAuth callback error', { error });

    if (error instanceof Error && error.message.includes('Missing state on cookie')) {
      return redirect(`/error/oauth-error?error=missing_state&request_id=${context.requestId}`);
    }

    return redirect(`/error/oauth-error?error=oauth_failed&request_id=${context.requestId}`);
  }
}

export default function Callback() {
  return (
    <div>
      <Trans>Loading...</Trans>
    </div>
  );
}
