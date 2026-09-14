import { DemoGroup, DemoRow, DemoSection, type DemoSectionMeta } from './demo-section';
import AppBadge from '@/components/badge/app-badge';
import BadgeState from '@/components/badge/badge-state';
import CustomerStatus from '@/components/badge/customer-status';
import { Chip } from '@/components/chip/chip';
import type { BadgeProps } from '@datum-cloud/datum-ui/badge';
import { Badge } from '@datum-cloud/datum-ui/badge';

export const badgeDemoSections: DemoSectionMeta[] = [
  { id: 'badge-base', label: 'Badge (datum-ui)' },
  { id: 'badge-state', label: 'BadgeState' },
  { id: 'badge-app', label: 'AppBadge' },
  { id: 'badge-customer', label: 'CustomerStatus' },
  { id: 'chip', label: 'Chip' },
];

const BADGE_TYPES: NonNullable<BadgeProps['type']>[] = [
  'primary',
  'secondary',
  'tertiary',
  'quaternary',
  'success',
  'info',
  'warning',
  'danger',
  'muted',
];

export default function BadgeDemo() {
  return (
    <DemoGroup
      title="Badges & Status"
      description="staff-portal's own status badges, built on the datum-ui Badge primitive.">
      <DemoSection
        id="badge-base"
        title="Badge (datum-ui)"
        description="The shared primitive — type × theme.">
        {(['solid', 'light', 'outline'] as const).map((theme) => (
          <DemoRow key={theme}>
            {BADGE_TYPES.map((type) => (
              <Badge key={type} type={type} theme={theme} className="capitalize">
                {type}
              </Badge>
            ))}
          </DemoRow>
        ))}
      </DemoSection>

      <DemoSection
        id="badge-state"
        title="BadgeState"
        description="Maps a resource state string to a color. Pill for panels, dot for dense tables.">
        <DemoRow>
          {['active', 'inactive', 'suspended', 'pending', 'approved', 'rejected', 'unknown'].map(
            (s) => (
              <BadgeState key={s} state={s} />
            )
          )}
        </DemoRow>
        <DemoRow>
          {['success', 'error', 'warning', 'info', 'deleting'].map((s) => (
            <BadgeState key={s} state={s} variant="dot" />
          ))}
        </DemoRow>
      </DemoSection>

      <DemoSection
        id="badge-app"
        title="AppBadge"
        description="Figma ticket-style chips (Open / Closed / In progress) and registration aliases.">
        <DemoRow>
          {['open', 'in-progress', 'closed', 'pending', 'approved', 'rejected', 'suspended'].map(
            (s) => (
              <AppBadge key={s} status={s} />
            )
          )}
        </DemoRow>
      </DemoSection>

      <DemoSection
        id="badge-customer"
        title="CustomerStatus"
        description="Compact status chip for dense customer list Status columns.">
        <DemoRow>
          {['active', 'inactive', 'flagged', 'fraud', 'failed'].map((s) => (
            <CustomerStatus key={s} status={s} />
          ))}
        </DemoRow>
      </DemoSection>

      <DemoSection
        id="chip"
        title="Chip"
        description="Collapses a list to N visible items with an overflow popover.">
        <DemoRow>
          <Chip items={['owner', 'admin', 'viewer', 'billing', 'auditor']} maxVisible={2} />
          <Chip items={['us-east', 'us-west', 'eu-central']} maxVisible={3} variant="outline" />
          <Chip items={['production']} variant="success" />
        </DemoRow>
      </DemoSection>
    </DemoGroup>
  );
}
