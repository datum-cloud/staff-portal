import { complianceRoutes } from '@/utils/config/routes.config';
import { Navigate } from 'react-router';

export default function Page() {
  return <Navigate to={complianceRoutes.vendors.list()} replace />;
}
