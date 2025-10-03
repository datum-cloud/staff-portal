import { profileRoutes } from '@/utils/config/routes.config';
import { redirect } from 'react-router';

export async function loader() {
  return redirect(profileRoutes.settings());
}

export default function Page() {
  return null;
}
