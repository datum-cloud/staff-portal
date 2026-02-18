import type { Route } from './+types/login';
import { authenticator } from '@/modules/auth';
import { isRedirectResponse, isValidRedirectPath, redirectToCookie } from '@/utils/cookies';
import { Trans } from '@lingui/react/macro';
import { redirect } from 'react-router';

export function meta({}: Route.MetaFunction) {
  return [
    { title: 'Datum - Staff Portal' },
    { name: 'description', content: 'Welcome to Datum - Staff Portal' },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get('redirectTo');

  try {
    return await authenticator.authenticate('zitadel', request);
  } catch (error) {
    // OAuth strategy throws redirect to IdP - set or clear redirectTo cookie
    if (isRedirectResponse(error)) {
      const headers = new Headers(error.headers);
      if (redirectTo && isValidRedirectPath(redirectTo)) {
        const cookie = await redirectToCookie.serialize(redirectTo);
        headers.append('Set-Cookie', cookie);
      } else {
        // Clear stale cookie when no redirectTo (user came directly to login)
        const clearCookie = await redirectToCookie.serialize('', { maxAge: 0 });
        headers.append('Set-Cookie', clearCookie);
      }
      return redirect(error.headers.get('Location') ?? '/', { headers });
    }
    throw error;
  }
}

export default function Login() {
  return (
    <div>
      <Trans>Loading...</Trans>
    </div>
  );
}
