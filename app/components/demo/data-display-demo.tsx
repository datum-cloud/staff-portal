import { DemoGroup, DemoRow, DemoSection, type DemoSectionMeta } from './demo-section';
import BadgeState from '@/components/badge/badge-state';
import { DescriptionList } from '@/components/description-list';
import Divider from '@/components/divider';
import { UserAvatar } from '@/components/user-avatar';
import { SectionCard } from '@/features/milo';
import { Button } from '@datum-cloud/datum-ui/button';
import { Text } from '@datum-cloud/datum-ui/typography';

export const dataDisplayDemoSections: DemoSectionMeta[] = [
  { id: 'section-card', label: 'SectionCard' },
  { id: 'description-list', label: 'DescriptionList' },
  { id: 'avatar', label: 'UserAvatar' },
  { id: 'divider', label: 'Divider' },
];

export default function DataDisplayDemo() {
  return (
    <DemoGroup
      title="Data Display"
      description="The presentational building blocks used on staff-portal detail pages.">
      <DemoSection
        id="section-card"
        title="SectionCard"
        description="Standard content card — optional title, description, and a right-aligned action slot."
        bare>
        <SectionCard
          title="Organization"
          description="Overview of the selected organization"
          action={
            <Button type="secondary" theme="outline" size="small">
              See all
            </Button>
          }>
          <Text as="p" textColor="muted">
            Card body content goes here.
          </Text>
        </SectionCard>
      </DemoSection>

      <DemoSection
        id="description-list"
        title="DescriptionList"
        description="Responsive key/value list — a table on desktop, stacked on mobile."
        bare>
        <SectionCard>
          <DescriptionList
            items={[
              { label: 'Name', value: 'Acme Corporation' },
              { label: 'Type', value: <BadgeState state="organization" /> },
              { label: 'Status', value: <BadgeState state="active" /> },
              { label: 'Owner', value: 'ada@acme.example' },
              { label: 'Created', value: 'Jan 12, 2026' },
            ]}
          />
        </SectionCard>
      </DemoSection>

      <DemoSection
        id="avatar"
        title="UserAvatar"
        description="Image when available, initials fallback otherwise.">
        <DemoRow>
          <UserAvatar name="Ada Lovelace" />
          <UserAvatar
            name="Grace Hopper"
            className="rounded-full"
            fallbackClassName="rounded-full"
          />
          <UserAvatar name="Datum Staff" className="size-12 text-lg" />
          <UserAvatar name="" />
        </DemoRow>
      </DemoSection>

      <DemoSection id="divider" title="Divider" description="Horizontal and vertical rules.">
        <div className="space-y-3">
          <Divider />
          <Divider size="lg" color="border-primary" />
          <div className="flex h-10 items-center gap-3">
            <Text>Left</Text>
            <Divider orientation="vertical" />
            <Text>Right</Text>
          </div>
        </div>
      </DemoSection>
    </DemoGroup>
  );
}
