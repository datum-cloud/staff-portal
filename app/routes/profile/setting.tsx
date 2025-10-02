import type { Route } from './+types/setting';
import { PreferencesForm } from '@/features/preferences';
import { ProfileForm } from '@/features/profile';
import { metaObject } from '@/utils/helpers';
import { Col, Row } from '@datum-ui/grid';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = () => {
  return metaObject('Settings');
};

export const handle = {
  breadcrumb: () => <Trans>Settings</Trans>,
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
    </div>
  );
}
