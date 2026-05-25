import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../../shared';
import type { Route } from './+types/feature-flags';
import { FeatureFlagList } from '@/features/feature-flags';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const handle = {
  breadcrumb: () => <Trans>Feature Flags</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Feature Flags - ${organizationName}`);
};

export default function Page() {
  const data = useOrganizationDetailData();
  return <FeatureFlagList orgName={data.metadata?.name ?? ''} />;
}
