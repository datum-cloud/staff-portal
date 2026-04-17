import type { Route } from './+types/setting';
import { PreferencesForm } from '@/features/preferences';
import { ProfileForm } from '@/features/profile';
import { UserIdentityCard } from '@/features/user/components/user-identity-card';
import { useApp } from '@/providers/app.provider';
import { metaObject } from '@/utils/helpers';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = () => {
  return metaObject('Settings');
};

export const handle = {
  breadcrumb: () => <Trans>Settings</Trans>,
};

export default function Page() {
  const { user } = useApp();
  return (
    <div className="m-4">
      <Row className="mb-4">
        <Col xs={24} md={{ span: 12, offset: 6 }}>
          <ProfileForm />
        </Col>
      </Row>

      <Row className="mb-4">
        <Col xs={24} md={{ span: 12, offset: 6 }}>
          <UserIdentityCard userId={user?.metadata?.name ?? ''} />
        </Col>
      </Row>

      <Row>
        <Col xs={24} md={{ span: 12, offset: 6 }}>
          <PreferencesForm />
        </Col>
      </Row>
    </div>
  );
}
