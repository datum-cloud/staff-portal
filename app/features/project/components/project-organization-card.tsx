import { DescriptionList } from '@/components/description-list';
import { DisplayId, DisplayName } from '@/components/display';
import { getOrganizationDisplayName } from '@/features/billing/utils';
import { SectionCard } from '@/features/milo';
import { orgRoutes } from '@/utils/config/routes.config';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisResourcemanagerV1Alpha1Organization } from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { Link } from 'react-router';

type Props = {
  organization: ComMiloapisResourcemanagerV1Alpha1Organization | undefined;
  className?: string;
};

export function ProjectOrganizationCard({ organization, className }: Props) {
  const orgName = organization?.metadata?.name ?? '';
  const displayName = organization
    ? getOrganizationDisplayName(organization) || orgName || '—'
    : '—';
  const company = organization?.spec?.contactInfo?.businessName?.trim() || null;

  return (
    <SectionCard className={cn(className)} title={<Trans>Organization</Trans>}>
      {!orgName ? (
        <Text size="sm" textColor="muted">
          <Trans>No organization linked</Trans>
        </Text>
      ) : (
        <DescriptionList
          items={[
            {
              label: <Trans>Company</Trans>,
              value: company ? (
                <Link to={orgRoutes.detail(orgName)} className="block truncate">
                  {company}
                </Link>
              ) : (
                <Text>—</Text>
              ),
            },
            {
              label: <Trans>Display name</Trans>,
              value: <DisplayName displayName={displayName} to={orgRoutes.detail(orgName)} />,
            },
            {
              label: <Trans>ID</Trans>,
              value: <DisplayId value={orgName} />,
            },
          ]}
        />
      )}
    </SectionCard>
  );
}
