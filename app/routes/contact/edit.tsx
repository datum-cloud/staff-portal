import type { Route } from './+types/edit';
import { getContactDetailMetadata, useContactDetailData } from './shared';
import { ContactForm } from '@/features/contact';
import { authenticator } from '@/modules/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shadcn/ui/card';
import { contactDetailQuery } from '@/resources/request/server';
import { Contact } from '@/resources/schemas';
import { metaObject } from '@/utils/helpers';
import { Col, Row } from '@datum-ui/grid';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { contactName } = getContactDetailMetadata(matches);
  return metaObject(`Edit - ${contactName}`);
};

export const handle = {
  breadcrumb: (data: Contact) => {
    const displayName = [data.spec?.givenName, data.spec?.familyName].filter(Boolean).join(' ');
    return <span>{displayName}</span>;
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await contactDetailQuery(session?.accessToken ?? '', params?.contactName ?? '');

  return data;
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
              <ContactForm contact={data} />
            </CardContent>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
