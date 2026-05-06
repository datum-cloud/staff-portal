import { useTicketListQuery } from '@/resources/request/client/queries/support.queries';
import { supportRoutes } from '@/utils/config/routes.config';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import { t } from '@lingui/core/macro';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

function sortedByActivity(tickets: any[]) {
  return [...tickets].sort((a, b) => {
    const ta = a.status?.lastActivity ?? a.metadata?.creationTimestamp ?? '';
    const tb = b.status?.lastActivity ?? b.metadata?.creationTimestamp ?? '';
    return ta < tb ? 1 : ta > tb ? -1 : 0;
  });
}

export function TicketNavButtons({ ticketName }: { ticketName: string }) {
  const { data } = useTicketListQuery();
  const tickets = sortedByActivity(data?.items ?? []);

  const idx = tickets.findIndex((ticket) => ticket.metadata?.name === ticketName);
  const prev = idx > 0 ? tickets[idx - 1] : null;
  const next = idx >= 0 && idx < tickets.length - 1 ? tickets[idx + 1] : null;

  if (tickets.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {prev ? (
        <LinkButton
          as={Link}
          href={supportRoutes.detail(prev.metadata?.name ?? '')}
          type="secondary"
          theme="outline"
          size="icon"
          title={prev.spec?.title ?? t`Previous ticket`}>
          <ChevronLeft className="h-4 w-4" />
        </LinkButton>
      ) : (
        <Button type="secondary" theme="outline" size="icon" disabled>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      {next ? (
        <LinkButton
          as={Link}
          href={supportRoutes.detail(next.metadata?.name ?? '')}
          type="secondary"
          theme="outline"
          size="icon"
          title={next.spec?.title ?? t`Next ticket`}>
          <ChevronRight className="h-4 w-4" />
        </LinkButton>
      ) : (
        <Button type="secondary" theme="outline" size="icon" disabled>
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
