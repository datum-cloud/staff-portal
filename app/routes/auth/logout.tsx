import type { Route } from './+types/login';
import { authenticator } from '@/modules/auth';
import { sessionCookie, tokenCookie } from '@/utils/cookies';
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

export async function loader({ request }: Route.LoaderArgs) {
  // do not await this, it will block the request
  authenticator.logout('zitadel', request).catch((error) => {
    logger.error('Error logging out', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  // clear cookies
  const token = await tokenCookie.destroy(request);
  const session = await sessionCookie.destroy(request);

  return redirect('/login', {
    headers: combineHeaders(token.headers, session.headers),
  });
}

export default function Logout() {
  return (
    <div>
      <Trans>Loading...</Trans>
    </div>
  );
}
