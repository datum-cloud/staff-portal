import type { Route } from './+types/index';
import { metaObject } from '@/utils/helpers';
import { redirect } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject('Dashboard');
};

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Temporary redirect to users
  return redirect('/users');
}

export default function Page() {
  return null;
}
