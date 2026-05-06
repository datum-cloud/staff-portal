import { Badge } from '@datum-cloud/datum-ui/badge';

type TicketStatus = 'open' | 'in-progress' | 'waiting-on-customer' | 'resolved' | 'closed';

const STATUS_CONFIG: Record<
  TicketStatus,
  {
    label: string;
    type: 'primary' | 'secondary' | 'success' | 'warning' | 'muted';
    theme: 'solid' | 'outline' | 'light';
  }
> = {
  open: { label: 'Open', type: 'primary', theme: 'solid' },
  'in-progress': { label: 'In Progress', type: 'warning', theme: 'light' },
  'waiting-on-customer': { label: 'Waiting on Customer', type: 'secondary', theme: 'outline' },
  resolved: { label: 'Resolved', type: 'success', theme: 'light' },
  closed: { label: 'Closed', type: 'muted', theme: 'outline' },
};

export function TicketStatusBadge({ status }: { status?: string }) {
  const cfg = STATUS_CONFIG[status as TicketStatus] ?? {
    label: status ?? 'Unknown',
    type: 'secondary' as const,
    theme: 'outline' as const,
  };
  return (
    <Badge type={cfg.type} theme={cfg.theme}>
      {cfg.label}
    </Badge>
  );
}
