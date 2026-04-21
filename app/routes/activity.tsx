import { activityRoutes } from '@/utils/config/routes.config';
import { redirect } from 'react-router';

/**
 * Redirect /activity to /activity/feed
 * Legacy route preserved for backwards compatibility
 */
export function loader() {
  return redirect(activityRoutes.feed());
}

export default function ActivityRedirect() {
  return null;
}
