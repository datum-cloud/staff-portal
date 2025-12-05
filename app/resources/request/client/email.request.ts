import { ListQueryParams } from '@/resources/schemas';
import { listNotificationMiloapisComV1Alpha1NamespacedEmail } from '@openapi/notification.miloapis.com/v1alpha1';

export const emailListQuery = async (
  namespace: string = 'milo-system',
  params?: ListQueryParams
) => {
  const response = await listNotificationMiloapisComV1Alpha1NamespacedEmail({
    path: { namespace },
    query: {
      limit: params?.limit,
      continue: params?.cursor,
    },
  });
  return response.data.data;
};
