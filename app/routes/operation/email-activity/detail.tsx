import type { Route } from './+types/detail';
import { EmailDetail } from '@/features/email/components/email-detail';
import { authenticator } from '@/modules/auth';
import { emailDetailQuery } from '@/resources/request/server/email.request';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { ComMiloapisNotificationV1Alpha1Email } from '@openapi/notification.miloapis.com/v1alpha1';
import { useLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<ComMiloapisNotificationV1Alpha1Email>(matches);
  return metaObject(
    `Email Activity - ${data?.spec?.recipient?.emailAddress || data?.status?.emailAddress}`
  );
};

export const handle = {
  breadcrumb: (data: ComMiloapisNotificationV1Alpha1Email) => (
    <span>{data?.spec?.recipient?.emailAddress || data?.status?.emailAddress}</span>
  ),
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);

  const data = await emailDetailQuery(
    session?.accessToken ?? '',
    params?.emailName ?? '',
    params?.namespace as string
  );

  return data;
};

export default function Page() {
  const data = useLoaderData<typeof loader>();

  return <EmailDetail email={data} />;
}
