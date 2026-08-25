import { DateTime } from '@/components/date';
import {
  getResourceCleanupMessage,
  isProjectDeleting,
} from '@/features/project/lib/project-deletion';
import { STATUS_ICONS } from '@/utils/config/icons.config';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisResourcemanagerV1Alpha1Project } from '@openapi/resourcemanager.miloapis.com/v1alpha1';

type Props = {
  project: ComMiloapisResourcemanagerV1Alpha1Project | undefined;
};

export function ProjectDeletionBanner({ project }: Props) {
  if (!isProjectDeleting(project)) return null;

  const startedAt = project?.metadata?.deletionTimestamp;
  const message = getResourceCleanupMessage(project);

  return (
    <Alert variant="warning" className="lg:col-span-2">
      <STATUS_ICONS.loading className="size-4 animate-spin" />
      <AlertTitle>
        <Trans>This project is being deleted</Trans>
        {startedAt ? (
          <>
            {' · '}
            <DateTime date={startedAt} variant="relative" addSuffix />
          </>
        ) : null}
      </AlertTitle>
      <AlertDescription>
        {message ? (
          <pre className="mt-2 overflow-x-auto font-mono text-xs whitespace-pre-wrap">
            {message}
          </pre>
        ) : (
          <p>
            <Trans>Cleanup is in progress. No named blockers yet.</Trans>
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
