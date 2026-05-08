import { Badge } from '@datum-cloud/datum-ui/badge';

type Priority = 'low' | 'medium' | 'high' | 'urgent';

const PRIORITY_CONFIG: Record<
  Priority,
  {
    label: string;
    type: 'secondary' | 'warning' | 'danger' | 'primary';
    theme: 'outline' | 'light' | 'solid';
  }
> = {
  low: { label: 'Low', type: 'secondary', theme: 'outline' },
  medium: { label: 'Medium', type: 'warning', theme: 'light' },
  high: { label: 'High', type: 'danger', theme: 'light' },
  urgent: { label: 'Urgent', type: 'danger', theme: 'solid' },
};

export function PriorityBadge({ priority }: { priority?: string }) {
  const cfg = PRIORITY_CONFIG[priority as Priority] ?? {
    label: priority ?? 'Unknown',
    type: 'secondary' as const,
    theme: 'outline' as const,
  };
  return (
    <Badge type={cfg.type} theme={cfg.theme}>
      {cfg.label}
    </Badge>
  );
}
