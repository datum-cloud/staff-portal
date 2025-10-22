import type { Route } from './+types/edit';
import { ContactDetailLoaderData, getContactDetailMetadata, useContactDetailData } from './shared';
import { ContactForm } from '@/features/contact';
import { authenticator } from '@/modules/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shadcn/ui/card';
import { contactDetailQuery, userDetailQuery } from '@/resources/request/server';
import { User } from '@/resources/schemas';
import { metaObject } from '@/utils/helpers';
import { Col, Row } from '@datum-ui/grid';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { contactName } = getContactDetailMetadata(matches);
  return metaObject(`Edit - ${contactName}`);
};

export const handle = {
  breadcrumb: (data: ContactDetailLoaderData) => {
    const displayName = [data.contact?.spec?.givenName, data.contact?.spec?.familyName]
      .filter(Boolean)
      .join(' ');
    return <span>{displayName}</span>;
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const contact = await contactDetailQuery(session?.accessToken ?? '', params?.contactName ?? '');

  let user: User | undefined;
  if (contact?.spec?.subject?.name) {
    user = await userDetailQuery(session?.accessToken ?? '', contact?.spec?.subject?.name ?? '');
  }

  return { contact, user };
};

export default function Page() {
  const data = useContactDetailData();

  return (
    <div className="m-4">
      <Row className="mb-4">
        <Col span={12} offset={6}>
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans>Contact Information</Trans>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContactForm contact={data?.contact} user={data?.user} />
            </CardContent>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
