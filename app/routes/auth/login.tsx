import type { Route } from './+types/login';
import { authenticator } from '@/modules/auth/auth.server';

export function meta({}: Route.MetaFunction) {
  return [
    { title: 'Datum - Staff Portal' },
    { name: 'description', content: 'Welcome to Datum - Staff Portal' },
  ];
}

export function loader({ request }: Route.LoaderArgs) {
  return authenticator.authenticate('zitadel', request);
}
