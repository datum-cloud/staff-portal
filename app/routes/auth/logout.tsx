import type { Route } from './+types/login';
import { authenticator } from '@/modules/auth/auth.server';
import { sessionCookie, tokenCookie } from '@/utils/cookies';
import { combineHeaders } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { redirect } from 'react-router';

export function meta({}: Route.MetaFunction) {
  return [
    { title: 'Datum - Staff Portal' },
    { name: 'description', content: 'Welcome to Datum - Staff Portal' },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await authenticator.logout('zitadel', request);

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
