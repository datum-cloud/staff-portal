import { BadgeState } from './index';
import { Text } from '@datum-cloud/datum-ui/typography';

export default function BadgeStateExample() {
  return (
    <div className="space-y-4 p-6">
      <Text as="h2" size="2xl" weight="bold" className="mb-4">
        BadgeState Component Examples
      </Text>

      <div className="space-y-2">
        <Text as="h3" size="lg" weight="semibold">
          Original States
        </Text>
        <div className="flex flex-wrap gap-2">
          <BadgeState state="yes" tooltip="Yes" />
          <BadgeState state="no" tooltip="No" />
          <BadgeState state="personal" tooltip="Personal" />
          <BadgeState state="organization" tooltip="Organization" />
          <BadgeState state="business" tooltip="Business" />
        </div>
      </div>

      <div className="space-y-2">
        <Text as="h3" size="lg" weight="semibold">
          Activity States (Default Text)
        </Text>
        <div className="flex flex-wrap gap-2">
          <BadgeState state="success" tooltip="Operation completed successfully" />
          <BadgeState state="error" tooltip="An error occurred during processing" />
          <BadgeState state="warning" tooltip="Warning: potential issue detected" />
          <BadgeState state="info" tooltip="Informational message" />
        </div>
      </div>

      <div className="space-y-2">
        <Text as="h3" size="lg" weight="semibold">
          Activity States (Custom Messages)
        </Text>
        <div className="flex flex-wrap gap-2">
          <BadgeState state="success" message="User created successfully" />
          <BadgeState state="error" message="Failed to save data" />
          <BadgeState state="warning" message="Disk space low" />
          <BadgeState state="info" message="Deployment in progress" />
        </div>
      </div>

      <div className="space-y-2">
        <Text as="h3" size="lg" weight="semibold">
          Without Colors
        </Text>
        <div className="flex flex-wrap gap-2">
          <BadgeState state="success" message="Operation complete" noColor />
          <BadgeState state="error" message="Failed" noColor />
          <BadgeState state="warning" message="Warning" noColor />
          <BadgeState state="info" message="Processing" noColor />
        </div>
      </div>
    </div>
  );
}
