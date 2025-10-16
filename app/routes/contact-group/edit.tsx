import type { Route } from './+types/edit';
import { getContactGroupDetailMetadata, useContactGroupDetailData } from './shared';
import { ContactGroupForm } from '@/features/contact-group';
import { authenticator } from '@/modules/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shadcn/ui/card';
import { contactGroupDetailQuery } from '@/resources/request/server';
import { ContactGroup } from '@/resources/schemas';
import { metaObject } from '@/utils/helpers';
import { Col, Row } from '@datum-ui/grid';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { contactGroupName } = getContactGroupDetailMetadata(matches);
  return metaObject(`Edit - ${contactGroupName}`);
};

export const handle = {
  breadcrumb: (data: ContactGroup) => {
    return <span>{data.spec?.displayName || data.metadata.name}</span>;
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await contactGroupDetailQuery(
    session?.accessToken ?? '',
    params?.contactGroupName ?? ''
  );

  return data;
};

export default function Page() {
  const data = useContactGroupDetailData();

  return (
    <div className="m-4">
      <Row className="mb-4">
        <Col span={12} offset={6}>
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
