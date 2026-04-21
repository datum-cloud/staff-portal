import { DateTime } from '@/components/date';
import { ControlPlaneStatus } from '@/resources/schemas';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

// Unified configuration for both modes
const StatusConfig = {
  // Multiple mode (individual conditions)
  True: {
    icon: CheckCircle,
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
  False: {
    icon: XCircle,
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
  Unknown: {
    icon: Clock,
    className:
      'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
  },
  // Control plane mode (summarized)
  [ControlPlaneStatus.Success]: {
    icon: CheckCircle,
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    label: 'Active',
  },
  [ControlPlaneStatus.Error]: {
    icon: XCircle,
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    label: 'Error',
  },
  [ControlPlaneStatus.Pending]: {
    icon: Clock,
    className:
      'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
    label: 'Pending',
  },
} as const;

interface KubernetesCondition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
  observedGeneration?: number;
}

interface KubernetesStatus {
  conditions?: KubernetesCondition[];
  [key: string]: any;
}

type Props = {
  condition?: KubernetesCondition;
  status?: KubernetesStatus | null;
  multiple?: boolean;
  showReason?: boolean;
  showMessage?: boolean;
  className?: string;
  customLabel?: string;
};

// Transform function for control plane status
function getControlPlaneStatus(status: any): { status: ControlPlaneStatus; message: string } {
  if (!status) return { status: ControlPlaneStatus.Pending, message: '' };

  const { conditions } = status;
  if (status && (conditions ?? []).length > 0) {
    const condition = conditions[0];
    return {
      status:
        condition?.status === 'True' ? ControlPlaneStatus.Success : ControlPlaneStatus.Pending,
      message: condition?.message ?? '',
    };
  }

  return {
    status: ControlPlaneStatus.Pending,
    message: 'Resource is being provisioned...',
  };
}

// Create tooltip content
function createTooltipContent(title: string, message: string, lastTransitionTime?: string) {
  return (
    <div className="max-w-xs">
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-sm">{message}</div>
      {lastTransitionTime && (
        <div className="mt-1 text-xs opacity-60">
          Last transition: <DateTime date={lastTransitionTime} tooltip={false} />
        </div>
      )}
    </div>
  );
}

const BadgeCondition = ({
  condition,
  status,
  multiple = true,
  showReason = false,
  showMessage = false,
  className,
  customLabel,
}: Props) => {
  // Control plane mode (single badge)
  if (!multiple && status !== undefined) {
    const { status: controlStatus, message } = getControlPlaneStatus(status);
    const config = StatusConfig[controlStatus];
    const IconComponent = config.icon;
    const displayLabel = customLabel || config.label;

    const badgeContent = (
      <Badge
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium',
          config.className,
          className
        )}>
        <IconComponent className="h-3 w-3" />
        {displayLabel}
      </Badge>
    );

    if (showMessage && message) {
      const tooltipContent = createTooltipContent(
        displayLabel,
        message,
        status?.conditions?.[0]?.lastTransitionTime
      );

      return (
        <Tooltip message={tooltipContent}>
          <div className="inline-flex cursor-help">{badgeContent}</div>
        </Tooltip>
      );
    }

    return badgeContent;
  }

  // Multiple conditions mode
  if (!condition) return null;

  const config =
    StatusConfig[condition.status as keyof typeof StatusConfig] || StatusConfig.Unknown;
  const IconComponent = config.icon;
  const displayLabel = customLabel || condition.type;

  const badgeContent = (
    <Badge
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        config.className,
        className
      )}>
      <IconComponent className="h-3 w-3" />
      {displayLabel}
      {showReason && condition.reason && (
        <span className="ml-1 text-xs opacity-75">({condition.reason})</span>
      )}
    </Badge>
  );

  if (showMessage && condition.message) {
    const tooltipContent = createTooltipContent(
      displayLabel,
      condition.message,
      condition.lastTransitionTime
    );

    return (
      <Tooltip message={tooltipContent}>
        <div className="inline-flex cursor-help">{badgeContent}</div>
      </Tooltip>
    );
  }

  return badgeContent;
};

export default BadgeCondition;
