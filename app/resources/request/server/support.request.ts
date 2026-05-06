import { http } from '@/modules/axios/axios.server';
import type { ComMiloApisSupportV1Alpha1SupportTicket } from '@openapi/support.miloapis.com/v1alpha1';

export const supportTicketDetailQuery = async (token: string, ticketName: string) => {
  const response = await http.get<ComMiloApisSupportV1Alpha1SupportTicket>(
    `/apis/support.miloapis.com/v1alpha1/supporttickets/${ticketName}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};
