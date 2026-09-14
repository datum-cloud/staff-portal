import { DemoGroup, DemoRow, DemoSection, type DemoSectionMeta } from './demo-section';
import { Button } from '@datum-cloud/datum-ui/button';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Info } from 'lucide-react';

export const feedbackDemoSections: DemoSectionMeta[] = [
  { id: 'tooltip', label: 'Tooltip' },
  { id: 'toast', label: 'Toast' },
];

export default function FeedbackDemo() {
  return (
    <DemoGroup
      title="Feedback"
      description="Transient feedback primitives used throughout staff-portal.">
      <DemoSection id="tooltip" title="Tooltip" description="Hover to reveal; supports four sides.">
        <DemoRow>
          <Tooltip message="Top tooltip" side="top">
            <Button type="secondary" theme="outline" size="small">
              Top
            </Button>
          </Tooltip>
          <Tooltip message="Right tooltip" side="right">
            <Button type="secondary" theme="outline" size="small">
              Right
            </Button>
          </Tooltip>
          <Tooltip message="Bottom tooltip" side="bottom">
            <Button type="secondary" theme="outline" size="small">
              Bottom
            </Button>
          </Tooltip>
          <Tooltip message="Contextual help">
            <span className="text-muted-foreground inline-flex cursor-help items-center gap-1 text-sm">
              <Info className="h-4 w-4" /> What is this?
            </span>
          </Tooltip>
        </DemoRow>
      </DemoSection>

      <DemoSection id="toast" title="Toast" description="Fire a transient notification.">
        <DemoRow>
          <Button type="success" onClick={() => toast.success('Saved successfully')}>
            Success
          </Button>
          <Button type="danger" onClick={() => toast.error('Something went wrong')}>
            Error
          </Button>
          <Button type="secondary" onClick={() => toast.info('Heads up — quota is nearing.')}>
            Info
          </Button>
          <Button
            type="tertiary"
            onClick={() => toast.warning('This action needs review before it applies.')}>
            Warning
          </Button>
        </DemoRow>
      </DemoSection>
    </DemoGroup>
  );
}
