import Tooltip from '@/components/tooltip';
import { cn } from '@/modules/shadcn/lib/utils';
import { Badge } from '@/modules/shadcn/ui/badge';
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
    variant: 'default' as const,
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
  no: {
    icon: null,
    variant: 'destructive' as const,
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
  personal: {
    icon: null,
    variant: 'default' as const,
    className:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
  organization: {
    icon: null,
    variant: 'default' as const,
    className:
      'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800',
  },
  business: {
    icon: null,
    variant: 'default' as const,
    className:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  },
} as const;

// Default configuration for unknown states
const DefaultConfig = {
  icon: null,
  variant: 'secondary' as const,
  className:
    'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
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
    return (
      <Badge
        variant={noColor ? 'outline' : config.variant}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium',
          noColor
            ? 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300'
            : config.className,
          className
        )}>
        {titleCase(normalizedState)}
      </Badge>
    );
  }

  const iconElement = null;

  if (tooltip) {
    return (
      <Tooltip message={titleCase(tooltip || normalizedState)}>
        <div className="inline-flex cursor-pointer">{iconElement}</div>
      </Tooltip>
    );
  }

  return <div>{iconElement}</div>;
};

export default BadgeState;
