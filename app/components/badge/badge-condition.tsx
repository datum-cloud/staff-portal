import { STATUS_BADGE_CLASS } from './badge-tokens';
import { DateTime } from '@/components/date';
import { ControlPlaneStatus } from '@/resources/schemas';
import { STATUS_ICONS } from '@/utils/config/icons.config';
import { startCase } from '@/utils/helpers';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';

// Unified configuration for both modes
const StatusConfig = {
  // Multiple mode (individual conditions)
  True: {
    icon: STATUS_ICONS.success,
    className: 'bg-success/10 text-success border-success/20',
  },
  False: {
    icon: STATUS_ICONS.error,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  Unknown: {
    icon: STATUS_ICONS.pending,
    className: 'bg-muted text-muted-foreground border-border',
  },
  // Control plane mode (summarized)
  [ControlPlaneStatus.Success]: {
    icon: STATUS_ICONS.success,
    className: 'bg-success/10 text-success border-success/20',
    label: 'Active',
  },
  [ControlPlaneStatus.Error]: {
    icon: STATUS_ICONS.error,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
    label: 'Error',
  },
  [ControlPlaneStatus.Pending]: {
    icon: STATUS_ICONS.pending,
    className: 'bg-muted text-muted-foreground border-border',
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
      <Text as="div" className="mt-1">
        {message}
      </Text>
      {lastTransitionTime && (
        <Text as="div" size="xs" className="mt-1 opacity-60">
          Last transition: <DateTime date={lastTransitionTime} tooltip={false} />
        </Text>
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
    // startCase to match BadgeState — one consistent casing for all status text.
    const displayLabel = startCase(customLabel || config.label);

    const badgeContent = (
      <Badge
        className={cn(
          'inline-flex items-center gap-1',
          STATUS_BADGE_CLASS,
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
  const displayLabel = startCase(customLabel || condition.type);

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
        <Text size="xs" className="ml-1 opacity-75">
          ({condition.reason})
        </Text>
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
