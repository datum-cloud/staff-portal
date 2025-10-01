import type { Route } from './+types/account';
import { PreferencesForm } from '@/features/preferences';
import { ProfileForm, ProfileSessionsCard } from '@/features/profile';
import { metaObject } from '@/utils/helpers';
import { Col, Row } from '@datum-ui/grid';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = () => {
  return metaObject('Account');
};

export const handle = {
  breadcrumb: () => <Trans>Account</Trans>,
};

export default function Page() {
  return (
    <div className="m-4">
      <Row className="mb-4">
        <Col span={12} offset={6}>
          <ProfileForm />
        </Col>
      </Row>

      <Row>
        <Col span={12} offset={6}>
          <PreferencesForm />
        </Col>
      </Row>

      <Row className="mt-4">
        <Col span={12} offset={6}>
          <ProfileSessionsCard />
        </Col>
      </Row>
    </div>
  );
}
