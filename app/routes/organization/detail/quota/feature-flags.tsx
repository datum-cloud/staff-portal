import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../../shared';
import type { Route } from './+types/feature-flags';
import { FeatureFlagList } from '@/features/feature-flags';
import { useApp } from '@/providers/app.provider';
import {
  featureFlagRegistrationListQuery,
  orgQuotaBucketListQuery,
  orgQuotaGrantCreateMutation,
  orgQuotaGrantDeleteMutation,
  orgQuotaGrantListQuery,
} from '@/resources/request/client';
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
  const { user } = useApp();
  const orgName = data.metadata?.name ?? '';
  const orgNamespace = `organization-${orgName}`;
  const currentUserEmail = user?.spec?.email ?? '';

  return (
    <FeatureFlagList
      orgName={orgName}
      orgNamespace={orgNamespace}
      currentUserEmail={currentUserEmail}
      queryKeyPrefix={['organizations', orgName, 'feature-flags']}
      fetchRegistrationsFn={() => featureFlagRegistrationListQuery()}
      fetchBucketsFn={() => orgQuotaBucketListQuery(orgName)}
      fetchGrantsFn={() => orgQuotaGrantListQuery(orgName)}
      createGrantFn={(namespace, payload, annotations) =>
        orgQuotaGrantCreateMutation(orgName, namespace, payload, annotations)
      }
      deleteGrantFn={(name, namespace) => orgQuotaGrantDeleteMutation(orgName, name, namespace)}
    />
  );
}
