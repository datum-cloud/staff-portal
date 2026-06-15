import { Alert, AlertDescription } from '@datum-cloud/datum-ui/alert';
import { Trans } from '@lingui/react/macro';
import { Info } from 'lucide-react';

export function EdgeAdvancedBanner() {
  return (
    <Alert variant="info">
      <Info className="size-4" />
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
