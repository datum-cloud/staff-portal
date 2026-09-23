import { DemoGroup, DemoRow, DemoSection, type DemoSectionMeta } from './demo-section';
import type { ButtonProps } from '@datum-cloud/datum-ui/button';
import { Button } from '@datum-cloud/datum-ui/button';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Download, Heart, Plus, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';

export const buttonDemoSections: DemoSectionMeta[] = [
  { id: 'button-types', label: 'Types' },
  { id: 'button-themes', label: 'Themes' },
  { id: 'button-sizes', label: 'Sizes & icons' },
  { id: 'button-states', label: 'Loading & disabled' },
];

const TYPES: NonNullable<ButtonProps['type']>[] = [
  'primary',
  'secondary',
  'tertiary',
  'warning',
  'danger',
  'success',
];

export default function ButtonDemo() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleLoadingDemo = (key: string) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  return (
    <DemoGroup
      title="Buttons"
      description="datum-ui Button — the primary action primitive used across staff-portal.">
      <DemoSection id="button-types" title="Types" description="Semantic intents.">
        <DemoRow>
          {TYPES.map((type) => (
            <Button key={type} type={type} className="capitalize">
              {type}
            </Button>
          ))}
        </DemoRow>
      </DemoSection>

      <DemoSection
        id="button-themes"
        title="Themes"
        description="Each type across the four themes.">
        <div className="space-y-4">
          {TYPES.map((type) => (
            <div key={type} className="space-y-2">
              <Text as="h4" size="xs" weight="medium" textColor="muted" className="capitalize">
                {type}
              </Text>
              <div className="flex flex-wrap gap-2">
                <Button type={type} theme="solid">
                  Solid
                </Button>
                <Button type={type} theme="light">
                  Light
                </Button>
                <Button type={type} theme="outline">
                  Outline
                </Button>
                <Button type={type} theme="borderless">
                  Borderless
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DemoSection>

      <DemoSection
        id="button-sizes"
        title="Sizes & icons"
        description="Size scale, icon-only, and leading/trailing icons.">
        <DemoRow>
          <Button size="small">Small</Button>
          <Button size="default">Default</Button>
          <Button size="large">Large</Button>
          <Button size="icon" icon={<Settings className="h-4 w-4" />} />
        </DemoRow>
        <DemoRow>
          <Button icon={<Plus className="h-4 w-4" />}>Add item</Button>
          <Button icon={<Download className="h-4 w-4" />} iconPosition="right">
            Download
          </Button>
          <Button type="danger" theme="outline" icon={<Trash2 className="h-4 w-4" />}>
            Delete
          </Button>
          <Button type="secondary" theme="light" icon={<Heart className="h-4 w-4" />}>
            Like
          </Button>
        </DemoRow>
      </DemoSection>

      <DemoSection
        id="button-states"
        title="Loading & disabled"
        description="Click to see the spinner swap in; disabled blocks interaction.">
        <DemoRow>
          <Button loading={loading.basic} onClick={() => handleLoadingDemo('basic')}>
            {loading.basic ? 'Loading…' : 'Click to load'}
          </Button>
          <Button
            type="danger"
            loading={loading.danger}
            onClick={() => handleLoadingDemo('danger')}>
            {loading.danger ? 'Deleting…' : 'Delete'}
          </Button>
          <Button
            size="icon"
            type="primary"
            theme="solid"
            icon={<Plus className="h-4 w-4" />}
            loading={loading.icon}
            onClick={() => handleLoadingDemo('icon')}
          />
        </DemoRow>
        <DemoRow>
          <Button disabled>Disabled</Button>
          <Button type="secondary" disabled>
            Disabled secondary
          </Button>
          <Button icon={<Settings className="h-4 w-4" />} disabled>
            Disabled with icon
          </Button>
          <Button block className="mt-1">
            Full-width block button
          </Button>
        </DemoRow>
      </DemoSection>
    </DemoGroup>
  );
}
