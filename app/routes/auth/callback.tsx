import type { Route } from './+types/callback';
import { authenticator } from '@/modules/auth/auth.server';
import { getSession } from '@/modules/auth/session.server';
import { AuthenticationError } from '@/utils/errors';
import { redirect } from 'react-router';

export function meta({}: Route.MetaFunction) {
  return [
    { title: 'Datum - Staff Portal' },
    { name: 'description', content: 'Welcome to Datum - Staff Portal' },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { session, headers } = await getSession(request);

  if (session) {
    return redirect('/', { headers });
  }

  // Authenticate user
  const credentials = await authenticator.authenticate('zitadel', request);
  if (!credentials) {
    throw new AuthenticationError('Authentication failed');
  }

  return authenticator.authenticate('zitadel', request);
}
