import type { Route } from './+types/legacy-redirect';
import { STAFF_GROUP_NAMESPACE } from '@/resources/request/client';
import { groupRoutes } from '@/utils/config/routes.config';
import { redirect } from 'react-router';

/**
 * `/admin/groups/<name>` from before group URLs carried a namespace (#849).
 * Those links only ever opened milo-system groups, so send them there.
 */
export async function loader({ params }: Route.LoaderArgs) {
  return redirect(groupRoutes.detail(STAFF_GROUP_NAMESPACE, params.groupName ?? ''));
}

export default function Page() {
  return null;
}
