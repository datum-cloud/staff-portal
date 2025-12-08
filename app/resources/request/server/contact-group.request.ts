import { readNotificationMiloapisComV1Alpha1NamespacedContactGroup } from '@openapi/notification.miloapis.com/v1alpha1';
import { UnwrapProxyResponse } from '@openapi/shared/core/types.gen';

export const contactGroupDetailQuery = async (
  token: string,
  contactGroupName: string,
  namespace: string = 'default'
) => {
  const response = await readNotificationMiloapisComV1Alpha1NamespacedContactGroup({
    path: {
      namespace,
      name: contactGroupName,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data as UnwrapProxyResponse<typeof response.data>;
};
