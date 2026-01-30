import { readNotificationMiloapisComV1Alpha1NamespacedEmail } from '@openapi/notification.miloapis.com/v1alpha1';
import { UnwrapProxyResponse } from '@openapi/shared/core/types.gen';

export const emailDetailQuery = async (
  token: string,
  emailName: string,
  namespace: string = 'milo-system'
) => {
  const response = await readNotificationMiloapisComV1Alpha1NamespacedEmail({
    path: {
      namespace,
      name: emailName,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data as UnwrapProxyResponse<typeof response.data>;
};
