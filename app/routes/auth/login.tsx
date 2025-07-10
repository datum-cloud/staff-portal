import type { Route } from './+types/login';
import { authenticator } from '@/modules/auth/auth.server';
import { Trans } from '@lingui/react/macro';

export function meta({}: Route.MetaFunction) {
  return [
    { title: 'Datum - Staff Portal' },
    { name: 'description', content: 'Welcome to Datum - Staff Portal' },
  ];
}

export function loader({ request }: Route.LoaderArgs) {
  return authenticator.authenticate('zitadel', request);
}

export default function Login() {
  return (
    <div>
      <Trans>Loading...</Trans>
    </div>
  );
}
