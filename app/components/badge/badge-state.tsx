import { STATUS_ICONS } from '@/utils/config/icons.config';
import { startCase } from '@/utils/helpers';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
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
  failed: {
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
  deleting: {
    icon: null,
    className:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
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
  // Platform access — suspended sits between approved (green) and rejected (red)
  suspended: {
    icon: null,
    className:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
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
  /** `pill` (default) is the full colored badge; `dot` is a compact colored dot + plain text, for dense tables. */
  variant?: 'pill' | 'dot';
};

// Reuses each state's `bg-*` color as a solid dot instead of the full pill background/border.
const DOT_CLASS_BY_BG: Record<string, string> = {
  'bg-green-100': 'bg-green-500',
  'bg-red-100': 'bg-red-500',
  'bg-blue-100': 'bg-blue-500',
  'bg-cyan-100': 'bg-cyan-500',
  'bg-amber-100': 'bg-amber-500',
  'bg-yellow-100': 'bg-yellow-500',
  'bg-gray-100': 'bg-gray-400',
  'bg-violet-100': 'bg-violet-500',
};

function dotClassName(config: BadgeStateConfigEntry): string {
  const bgToken = config.className.split(' ').find((c) => c in DOT_CLASS_BY_BG);
  return bgToken ? DOT_CLASS_BY_BG[bgToken] : 'bg-gray-400';
}

const BadgeState = ({
  state,
  message,
  noColor,
  tooltip,
  icon,
  className,
  loading,
  variant = 'pill',
}: Props) => {
  const rawState = String(state ?? '');
  const normalizedState = rawState.toLowerCase();
  const config = StateConfig[normalizedState as State] || DefaultConfig;
  const IconComponent = icon || config.icon;

  if (!normalizedState && !message) return null;

  // Use custom message if provided, otherwise pass the original (non-lowercased)
  // state to startCase so CamelCase API values like "PendingApproval" split into
  // "Pending Approval" instead of collapsing to "Pendingapproval".
  const displayText = message || startCase(rawState);

  const badgeContent =
    variant === 'dot' ? (
      <span className={cn('text-foreground inline-flex items-center gap-1.5 text-sm', className)}>
        {loading ? (
          <STATUS_ICONS.loading className="text-muted-foreground size-3 shrink-0 animate-spin" />
        ) : (
          <span className={cn('size-1.5 shrink-0 rounded-full', dotClassName(config))} />
        )}
        {displayText}
      </span>
    ) : (
      <Badge
        theme={noColor ? 'outline' : undefined}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0 text-xs font-medium',
          noColor
            ? 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300'
            : config.className,
          className
        )}>
        {IconComponent ? <IconComponent className="h-2.5 w-2.5" /> : null}
        {loading ? <STATUS_ICONS.loading className="h-2.5 w-2.5 animate-spin" /> : null}
        {displayText}
      </Badge>
    );

  if (tooltip) {
    return (
      <Tooltip message={tooltip}>
        <div className="inline-flex cursor-help">{badgeContent}</div>
      </Tooltip>
    );
  }

  return badgeContent;
};

export default BadgeState;
