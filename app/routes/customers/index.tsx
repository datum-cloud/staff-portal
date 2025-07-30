import { userRoutes } from '@/utils/config/routes.config';
import { redirect } from 'react-router';

export async function loader() {
  // Redirect /customers to /customers/users
  return redirect(userRoutes.list());
}

export default function Page() {
  return null;
}
