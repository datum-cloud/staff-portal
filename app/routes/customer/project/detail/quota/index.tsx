import type { Route } from './+types/index';
import { projectRoutes } from '@/utils/config/routes.config';
import { redirect } from 'react-router';

export async function loader({ params }: Route.LoaderArgs) {
  return redirect(projectRoutes.quota.usage(params.projectName ?? ''));
}

export default function Page() {
  return null;
}
