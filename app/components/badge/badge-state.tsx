import { startCase } from '@/utils/helpers';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

type BadgeStateIcon = React.ElementType<{ className?: string }>;
type BadgeStateConfigEntry = {
  icon: BadgeStateIcon | null;
  className: string;
};

const StateConfig = {
  yes: {
    icon: null,
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
  no: {
    icon: null,
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
  true: {
    icon: null,
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
  false: {
    icon: null,
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
  active: {
    icon: null,
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
  inactive: {
    icon: null,
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
  personal: {
    icon: null,
    className:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
  organization: {
    icon: null,
    className:
      'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800',
  },
  business: {
    icon: null,
    className:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  },
  public: {
    icon: null,
    className:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
  private: {
    icon: null,
    className:
      'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800',
  },
  // Activity log states
  success: {
    icon: null,
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
  error: {
    icon: null,
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
  warning: {
    icon: null,
    className:
      'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  },
  info: {
    icon: null,
    className:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
  pending: {
    icon: null,
    className:
      'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
  },
  // Registration approval states
  approved: {
    icon: null,
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
  accepted: {
    icon: null,
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
  rejected: {
    icon: null,
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
  declined: {
    icon: null,
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
  unknown: {
    icon: null,
    className:
      'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-500 dark:border-gray-800',
  },
  // Action verbs
  create: {
    icon: null,
    className:
      'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800',
  },
  update: {
    icon: null,
    className:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  },
  patch: {
    icon: null,
    className:
      'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800',
  },
  delete: {
    icon: null,
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
  deletecollection: {
    icon: null,
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
  get: {
    icon: null,
    className:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
  list: {
    icon: null,
    className:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
  watch: {
    icon: null,
    className:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
} as Record<string, BadgeStateConfigEntry>;

// Default configuration for unknown states
const DefaultConfig = {
  icon: null,
  className:
    'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
};

type State = keyof typeof StateConfig;

type Props = {
  state: State | string;
  message?: string; // Custom text to display instead of state name
  noColor?: boolean;
  tooltip?: string;
  icon?: BadgeStateIcon;
  className?: string;
  loading?: boolean;
};

const BadgeState = ({ state, message, noColor, tooltip, icon, className, loading }: Props) => {
  const normalizedState = String(state ?? '').toLowerCase();
  const config = StateConfig[normalizedState as State] || DefaultConfig;
  const IconComponent = icon || config.icon;

  if (!normalizedState && !message) return null;

  // Use custom message if provided, otherwise fall back to titleCase state
  const displayText = message || startCase(normalizedState);
  const badgeContent = (
    <Badge
      theme={noColor ? 'outline' : undefined}
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        noColor
          ? 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300'
          : config.className,
        className
      )}>
      {IconComponent ? <IconComponent className="h-3 w-3" /> : null}
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {displayText}
    </Badge>
  );

  if (tooltip) {
    return (
      <Tooltip message={startCase(tooltip || normalizedState)}>
        <div className="inline-flex cursor-help">{badgeContent}</div>
      </Tooltip>
    );
  }

  return badgeContent;
};

export default BadgeState;
