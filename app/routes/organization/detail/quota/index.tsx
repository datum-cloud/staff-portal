import type { Route } from './+types/index';
import { orgRoutes } from '@/utils/config/routes.config';
import { redirect } from 'react-router';

export async function loader({ params }: Route.LoaderArgs) {
  return redirect(orgRoutes.quota.usage(params.orgName ?? ''));
}

export default function Page() {
  return null;
}
