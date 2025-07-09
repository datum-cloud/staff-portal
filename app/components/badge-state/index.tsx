import { cn } from '@/modules/shadcn/lib/utils';
import { Badge } from '@/modules/shadcn/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/modules/shadcn/ui/tooltip';
import * as React from 'react';

// Helper function to convert string to title case
function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const StateConfig = {
  yes: {
    icon: null,
    color: 'bg-green-500',
  },
  no: {
    icon: null,
    color: 'bg-red-400',
  },
  personal: {
    icon: null,
    color: 'bg-blue-500',
  },
} as const;

type State = keyof typeof StateConfig;

type Props = {
  state: State | string;
  noColor?: boolean;
  tooltip?: string;
  className?: string;
};

const BadgeState = ({ state, noColor, tooltip, className }: Props) => {
  const normalizedState = String(state ?? '').toLowerCase();
  const config = StateConfig[normalizedState as State];

  if (!config) return null;

  const IconComponent = config.icon;

  if (!IconComponent) {
    const textColor = (config as any).textColor || 'text-white';

    return (
      <Badge
        variant="outline"
        className={cn(
          noColor ? '' : config.color,
          noColor ? '' : textColor,
          'border-none',
          'text-xs',
          className
        )}>
        {titleCase(normalizedState)}
      </Badge>
    );
  }

  // Since all our states have null icons, this code path is never reached
  // But keeping it for future extensibility
  const iconElement = null;

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex cursor-pointer">{iconElement}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{titleCase(tooltip || normalizedState)}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return <div>{iconElement}</div>;
};

export default BadgeState;
