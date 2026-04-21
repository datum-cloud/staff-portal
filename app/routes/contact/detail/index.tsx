import { getContactDetailMetadata, useContactDetailData } from '../shared';
import type { Route } from './+types/index';
import { ContactForm } from '@/features/contact';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { contactName } = getContactDetailMetadata(matches);
  return metaObject(`Details - ${contactName}`);
};

export default function Page() {
  const data = useContactDetailData();

  return (
    <div className="m-4">
      <Row className="mb-4">
        <Col xs={24} md={{ span: 12, offset: 6 }}>
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
