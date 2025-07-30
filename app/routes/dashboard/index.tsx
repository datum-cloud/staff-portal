import type { Route } from './+types/index';
import { userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { redirect } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject('Dashboard');
};

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Temporary redirect to users
  return redirect(userRoutes.list());
}

export default function Page() {
  return null;
}
