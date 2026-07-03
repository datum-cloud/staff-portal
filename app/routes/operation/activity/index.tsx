import { activityRoutes } from '@/utils/config/routes.config';
import { redirect } from 'react-router';

/**
 * Redirect /activity to /activity/feed
 */
export function loader() {
  return redirect(activityRoutes.feed());
}

export default function ActivityIndex() {
  return null;
}
