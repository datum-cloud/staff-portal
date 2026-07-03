import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../shared';
import type { Route } from './+types/dns';
import { DnsZoneList, useOrgDnsList } from '@/features/dns';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const handle = {
  breadcrumb: () => <Trans>DNS</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`DNS - ${organizationName}`);
};

export default function Page() {
  const data = useOrganizationDetailData();
  const orgName = data?.metadata?.name ?? '';
  const { rows, isLoading } = useOrgDnsList(orgName);

  return (
    <DnsZoneList
      data={rows}
      loading={isLoading}
      showProjectColumn
      linkBuilder={(row) =>
        projectRoutes.dns.detail(
          row.projectName,
          row.dnsZone.metadata?.namespace ?? '',
          row.dnsZone.metadata?.name ?? ''
        )
      }
    />
  );
}
