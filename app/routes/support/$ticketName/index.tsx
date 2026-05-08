import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { DateTime } from '@/components/date';
import { MarkdownBody } from '@/components/markdown-body';
import { TicketActions } from '@/features/support';
import { MessageThread } from '@/features/support/components/message-thread';
import { PriorityBadge } from '@/features/support/components/priority-badge';
import { ReplyForm } from '@/features/support/components/reply-form';
import { TicketNavButtons } from '@/features/support/components/ticket-nav-buttons';
import { TicketStatusBadge } from '@/features/support/components/ticket-status-badge';
import { useApp } from '@/providers/app.provider';
import {
  useTicketDetailQuery,
  useMarkTicketReadMutation,
} from '@/resources/request/client/queries/support.queries';
import { userRoutes, orgRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import { UserCircle } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router';

export const meta: Route.MetaFunction = () => metaObject(t`Ticket Details`);

export default function TicketDetailPage() {
  const { ticketName } = useParams<{ ticketName: string }>();
  const name = ticketName ?? '';
  const { principalId, displayName } = useApp();
  const { data: ticket, isLoading } = useTicketDetailQuery(name);
  const markRead = useMarkTicketReadMutation();

  useEffect(() => {
    if (name && principalId) {
      markRead.mutate({ ticketName: name, principalId });
    }
    // Only on mount or ticket change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const authorRef = {
    name: principalId ?? 'staff',
    displayName: displayName ?? 'Support Staff',
  };

  const owner = ticket?.spec.ownerRef;
  const ownerLabel = owner?.displayName || owner?.email || owner?.name || t`Unassigned`;

  return (
    <>
      <AppActionBar>
        <TicketNavButtons ticketName={name} />
      </AppActionBar>
      {isLoading && <div className="text-muted-foreground p-6">{t`Loading...`}</div>}
      {!isLoading && !ticket && <div className="text-destructive p-6">{t`Ticket not found.`}</div>}
      {ticket && (
        <div className="flex gap-6 p-6">
          {/* Main column */}
          <div className="min-w-0 flex-1 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start gap-3">
                <h1 className="min-w-0 flex-1 text-xl font-semibold">{ticket.spec.title}</h1>
                <div className="flex shrink-0 items-center gap-2">
                  <TicketStatusBadge status={ticket.spec.status} />
                  <PriorityBadge priority={ticket.spec.priority} />
                </div>
              </div>
              <p className="text-muted-foreground mt-1 font-mono text-xs">
                #{ticket.metadata?.name}
              </p>
            </div>

            {/* Owner callout */}
            <div className="bg-muted/40 flex items-center gap-2 rounded-lg border px-4 py-3">
              <UserCircle className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="text-muted-foreground text-sm">{t`Responsible:`}</span>
              {owner ? (
                <Link
                  to={userRoutes.detail(owner.name)}
                  className="text-primary text-sm font-semibold hover:underline">
                  {ownerLabel}
                </Link>
              ) : (
                <span className="text-sm font-medium text-amber-600">{t`Unassigned`}</span>
              )}
            </div>

            {/* Description */}
            {ticket.spec.description && (
              <div className="rounded-lg border p-4">
                <h2 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
                  {t`Description`}
                </h2>
                <MarkdownBody content={ticket.spec.description} />
              </div>
            )}

            {/* Reporter + dates metadata */}
            <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-xs">
              <span>
                {t`From:`}{' '}
                <Link
                  to={userRoutes.detail(ticket.spec.reporterRef.name)}
                  className="text-foreground hover:text-primary font-medium hover:underline">
                  {ticket.spec.reporterRef.displayName ||
                    ticket.spec.reporterRef.email ||
                    ticket.spec.reporterRef.name}
                </Link>
              </span>
              {ticket.spec.organizationRef && (
                <span>
                  {t`Org:`}{' '}
                  <Link
                    to={orgRoutes.detail(ticket.spec.organizationRef.name)}
                    className="text-foreground hover:text-primary font-medium hover:underline">
                    {ticket.spec.organizationRef.name}
                  </Link>
                </span>
              )}
              {ticket.metadata?.creationTimestamp && (
                <span>
                  {t`Opened:`}{' '}
                  <DateTime
                    date={ticket.metadata.creationTimestamp}
                    className="text-foreground font-medium"
                  />
                </span>
              )}
            </div>

            {/* Messages + reply */}
            <div className="space-y-1">
              <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {t`Messages`}
              </h2>
            </div>
            <MessageThread ticketName={name} />
            <ReplyForm ticketName={name} authorRef={authorRef} />
          </div>

          {/* Sidebar */}
          <div className="w-64 shrink-0">
            <TicketActions ticketName={name} />
          </div>
        </div>
      )}
    </>
  );
}
