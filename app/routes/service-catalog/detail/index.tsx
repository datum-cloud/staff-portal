import { serviceCatalogRoutes } from '@/utils/config/routes.config';
import { Navigate, useParams } from 'react-router';

export default function ServiceDetailIndex() {
  const { name } = useParams<{ name: string }>();
  const serviceName = name ?? '';

  return <Navigate to={serviceCatalogRoutes.overview(serviceName)} replace />;
}
