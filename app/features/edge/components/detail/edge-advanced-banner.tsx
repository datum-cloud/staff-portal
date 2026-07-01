import { STATUS_ICONS } from '@/utils/config/icons.config';
import { Alert, AlertDescription } from '@datum-cloud/datum-ui/alert';
import { Trans } from '@lingui/react/macro';

export function EdgeAdvancedBanner() {
  return (
    <Alert variant="info">
      <STATUS_ICONS.info className="size-4" />
      <AlertDescription>
        <p>
          <Trans>
            This AI Edge has advanced configuration that cannot be represented in the simplified
            overview fields. See the YAML section below for the full resource definition including
            routing rules, filters, and matches.
          </Trans>
        </p>
      </AlertDescription>
    </Alert>
  );
}
