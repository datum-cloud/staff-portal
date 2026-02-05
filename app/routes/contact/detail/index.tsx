import { getContactDetailMetadata, useContactDetailData } from '../shared';
import type { Route } from './+types/index';
import { ContactForm } from '@/features/contact';
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shadcn/ui/card';
import { metaObject } from '@/utils/helpers';
import { Col, Row } from '@datum-ui/grid';
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
