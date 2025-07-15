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
    color: '#10b981',
  },
  no: {
    icon: null,
    color: '#f87171',
  },
  personal: {
    icon: null,
    color: '#3b82f6',
  },
  organization: {
    icon: null,
    color: '#06b6d4',
  },
  business: {
    icon: null,
    color: '#f59e0b',
  },
} as const;

// Default configuration for unknown states
const DefaultConfig = {
  icon: null,
  color: '#6b7280',
  textColor: '#ffffff',
};

type State = keyof typeof StateConfig;

type Props = {
  state: State | string;
  noColor?: boolean;
  tooltip?: string;
  className?: string;
};

const BadgeState = ({ state, noColor, tooltip, className }: Props) => {
  const normalizedState = String(state ?? '').toLowerCase();
  const config = StateConfig[normalizedState as State] || DefaultConfig;

  if (!normalizedState) return null;

  const IconComponent = config.icon;

  if (!IconComponent) {
    const textColor = (config as any).textColor || '#ffffff';

    return (
      <Badge
        variant="outline"
        className={cn('border-none', 'text-xs', className)}
        style={{
          backgroundColor: noColor ? 'transparent' : config.color,
          color: noColor ? 'inherit' : textColor,
        }}>
        {titleCase(normalizedState)}
      </Badge>
    );
  }

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
