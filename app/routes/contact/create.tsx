import type { Route } from './+types/create';
import { ContactForm } from '@/features/contact';
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shadcn/ui/card';
import { metaObject } from '@/utils/helpers';
import { Col, Row } from '@datum-ui/grid';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Contacts - Create`);
};

export const handle = {
  breadcrumb: () => <Trans>Create</Trans>,
};

export default function Page() {
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
              <ContactForm />
            </CardContent>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
