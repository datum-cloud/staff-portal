import { readNotificationMiloapisComV1Alpha1NamespacedContact } from '@openapi/notification.miloapis.com/v1alpha1';
import { UnwrapProxyResponse } from '@openapi/shared/core/types.gen';

export const contactDetailQuery = async (
  token: string,
  contactName: string,
  namespace: string = 'default'
) => {
  const response = await readNotificationMiloapisComV1Alpha1NamespacedContact({
    path: {
      namespace,
      name: contactName,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data as UnwrapProxyResponse<typeof response.data>;
};
