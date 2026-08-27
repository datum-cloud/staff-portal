import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { DisplayText } from '@/components/display';
import { SectionCard } from '@/features/milo';
import { getProjectPhase, isProjectDeleting } from '@/features/project/lib/project-phase';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisResourcemanagerV1Alpha1Project } from '@openapi/resourcemanager.miloapis.com/v1alpha1';

type Props = {
  project: ComMiloapisResourcemanagerV1Alpha1Project | undefined;
  className?: string;
};

export function ProjectDetailsCard({ project, className }: Props) {
  const resourceName = project?.metadata?.name ?? '—';
  const displayName =
    project?.metadata?.annotations?.['kubernetes.io/description']?.trim() || resourceName;
  const createdAt = project?.metadata?.creationTimestamp;
  const deleting = isProjectDeleting(project);
  const deletingSince = project?.metadata?.deletionTimestamp;
  const phase = getProjectPhase(project);

  return (
    <SectionCard className={cn(className)} title={<Trans>Details</Trans>}>
      <DescriptionList
        items={[
          {
            label: <Trans>Display name</Trans>,
            value: <Text>{displayName}</Text>,
          },
          {
            label: <Trans>Resource name</Trans>,
            value: <DisplayText value={resourceName} withCopy />,
          },
          {
            label: <Trans>Status</Trans>,
            value: <BadgeState state={phase} loading={deleting} />,
          },
          {
            label: <Trans>Deleting since</Trans>,
            hidden: !deleting,
            value: (
              <Text>
                <DateTime date={deletingSince} variant="both" />
              </Text>
            ),
          },
          {
            label: <Trans>Created</Trans>,
            value: (
              <Text>
                <DateTime date={createdAt} variant="both" />
              </Text>
            ),
          },
        ]}
      />
    </SectionCard>
  );
}
