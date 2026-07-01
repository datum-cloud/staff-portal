import { orgRoutes } from '@/utils/config/routes.config';
import { redirect } from 'react-router';

export async function loader() {
  // Redirect /customers to /customers/organizations
  return redirect(orgRoutes.list());
}

export default function Page() {
  return null;
}
