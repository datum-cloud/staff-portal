import type { Route } from './+types/callback';
import { authenticator } from '@/modules/auth/auth.server';
import { setSession } from '@/modules/auth/session.server';
import { AuthenticationError } from '@/utils/errors';
import { redirect } from 'react-router';

export function meta({}: Route.MetaFunction) {
  return [
    { title: 'Datum - Staff Portal' },
    { name: 'description', content: 'Welcome to Datum - Staff Portal' },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  // Authenticate user
  const credentials = await authenticator.authenticate('zitadel', request);
  if (!credentials) {
    throw new AuthenticationError('Authentication failed');
  }

  const session = await setSession(request, credentials);
  return redirect('/', { headers: session.headers });
}

export default function Callback() {
  return <div>Loading...</div>;
}
