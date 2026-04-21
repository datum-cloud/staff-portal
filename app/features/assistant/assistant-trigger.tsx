import { useAssistant } from './assistant-context';
import { Button } from '@datum-cloud/datum-ui/button';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Brain } from 'lucide-react';

export function AssistantTrigger() {
  const { isOpen, toggle } = useAssistant();

  return (
    <Tooltip message="Patch AI">
      <Button
        type="quaternary"
        theme="borderless"
        size="small"
        onClick={toggle}
        aria-label="Patch AI"
        className={cn(
          'hover:bg-sidebar-accent relative h-7 w-7 rounded-lg p-0 transition-colors duration-300',
          isOpen && 'bg-sidebar-accent'
        )}>
        <Brain className="text-icon-header size-4" />
      </Button>
    </Tooltip>
  );
}
