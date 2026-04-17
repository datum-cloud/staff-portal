import type { Route } from './+types/create';
import { ContactGroupForm } from '@/features/contact-group';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Contact Groups - Create`);
};

export const handle = {
  breadcrumb: () => <Trans>Create</Trans>,
};

export default function Page() {
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
              <ContactGroupForm />
            </CardContent>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
