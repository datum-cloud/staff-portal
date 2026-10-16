import type { Route } from './+types/reauth';
import { redirectToReauth } from '@/modules/auth/reauth.server';
import { Trans } from '@lingui/react/macro';

export function meta({}: Route.MetaFunction) {
  return [
    { title: 'Datum - Staff Portal' },
    { name: 'description', content: 'Welcome to Datum - Staff Portal' },
  ];
}

/**
 * Entry point for the browser when an API call reports an expired session.
 * Lives outside the public layout: that layout sends anyone with a session
 * cookie home, and here the cookie is present but stale.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const redirectTo = new URL(request.url).searchParams.get('redirectTo') ?? '/';
  return redirectToReauth(request, redirectTo);
}

export default function Reauth() {
  return (
    <div>
      <Trans>Loading...</Trans>
    </div>
  );
}
