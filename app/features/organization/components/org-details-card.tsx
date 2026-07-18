import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { DisplayText } from '@/components/display';
import { SectionCard } from '@/features/milo';
import type { GqlOrganization } from '@/modules/graphql/organizations';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisResourcemanagerV1Alpha1Organization } from '@openapi/resourcemanager.miloapis.com/v1alpha1';

type Props = {
  org: GqlOrganization | null | undefined;
  k8sOrg: ComMiloapisResourcemanagerV1Alpha1Organization | undefined;
  isLoading?: boolean;
  className?: string;
};

export function OrgDetailsCard({ org, k8sOrg, isLoading, className }: Props) {
  const company = org?.contactInfo?.businessName?.trim() || null;
  const displayName =
    org?.displayName ||
    k8sOrg?.metadata?.annotations?.['kubernetes.io/display-name'] ||
    k8sOrg?.metadata?.name ||
    '—';
  const resourceName = org?.name || k8sOrg?.metadata?.name || '—';
  const entityType = org?.entityType;
  const platformType = org?.type || k8sOrg?.spec?.type || 'Organization';
  const createdAt = org?.createdAt || k8sOrg?.metadata?.creationTimestamp;
  const projectCount = org?.projectCount;
  const hasMoreProjects = org?.hasMoreProjects;

  return (
    <SectionCard className={cn(className)} title={<Trans>Details</Trans>}>
      {isLoading && !k8sOrg ? (
        <Text size="sm" textColor="muted">
          <Trans>Loading details…</Trans>
        </Text>
      ) : (
        <DescriptionList
          items={[
            {
              label: <Trans>Company name</Trans>,
              value: <Text>{company || '—'}</Text>,
            },
            {
              label: <Trans>Display name</Trans>,
              value: <Text>{displayName}</Text>,
            },
            {
              label: <Trans>Resource name</Trans>,
              value: <DisplayText value={resourceName} withCopy />,
            },
            {
              label: <Trans>Entity type</Trans>,
              value: entityType ? <BadgeState state={entityType} /> : <Text>—</Text>,
            },
            {
              label: <Trans>Type</Trans>,
              value: <BadgeState state={platformType} />,
            },
            {
              label: <Trans>Created</Trans>,
              value: (
                <Text>
                  <DateTime date={createdAt} variant="both" />
                </Text>
              ),
            },
            {
              label: <Trans>Projects</Trans>,
              value: (
                <Text>
                  {projectCount == null
                    ? '—'
                    : hasMoreProjects
                      ? `${projectCount}+`
                      : String(projectCount)}
                </Text>
              ),
            },
          ]}
        />
      )}
    </SectionCard>
  );
}
