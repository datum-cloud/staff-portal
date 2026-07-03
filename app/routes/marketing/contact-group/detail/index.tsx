import { getContactGroupDetailMetadata, useContactGroupDetailData } from '../shared';
import type { Route } from './+types/index';
import { ContactGroupForm } from '@/features/contact-group';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { contactGroupName } = getContactGroupDetailMetadata(matches);
  return metaObject(`Details - ${contactGroupName}`);
};

export default function Page() {
  const data = useContactGroupDetailData();

  return (
    <div className="m-4">
      <Row className="mb-4">
        <Col xs={24} md={{ span: 12, offset: 6 }}>
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans>Contact Group Information</Trans>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContactGroupForm contactGroup={data} />
            </CardContent>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
