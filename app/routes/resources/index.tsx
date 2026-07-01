import { edgeRoutes } from '@/utils/config/routes.config';
import { redirect } from 'react-router';

// /customers/resources → default to the first tab (AI Edge).
export function loader() {
  return redirect(edgeRoutes.list());
}
