import { redirect } from 'react-router';

/**
 * Redirect /activity to /activity/feed
 */
export function loader() {
  return redirect('/activity/feed');
}

export default function ActivityIndex() {
  return null;
}
