import { supportRoutes } from '@/utils/config/routes.config';
import { useParams } from 'react-router';
import { Navigate } from 'react-router';

export default function TicketMessagesRedirect() {
  const { ticketName } = useParams<{ ticketName: string }>();
  return <Navigate to={supportRoutes.detail(ticketName ?? '')} replace />;
}
