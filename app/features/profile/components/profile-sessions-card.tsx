import { DateFormatter } from '@/components/date';
import { Button } from '@/modules/shadcn/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shadcn/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/shadcn/ui/table';
import { useApp } from '@/providers/app.provider';
import { sessionDeleteMutation, sessionListQuery } from '@/resources/request/client';
import { IdentitySession } from '@/resources/schemas';
import { Tooltip } from '@datum-ui/tooltip';
import { Trans } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { Trash } from 'lucide-react';

export function ProfileSessionsCard() {
  const { user } = useApp();
  const userId = user?.metadata.name || '';
  const query = useQuery({
    queryKey: ['identity', 'sessions', userId],
    queryFn: () => sessionListQuery(userId),
    enabled: !!userId,
    select: (data) => (data as any)?.data?.items as IdentitySession[] | undefined,
  });
  const sessions = query.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Active Sessions</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">
                  <Trans>Session ID</Trans>
                </TableHead>
                <TableHead>
                  <Trans>IP</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Created</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Expires</Trans>
                </TableHead>
                <TableHead className="w-[1%] text-right">
                  <Trans>Action</Trans>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Trans>No active sessions.</Trans>
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((s) => {
                  const sessionId = s.metadata.name;
                  const shortId =
                    sessionId && sessionId.length > 14 ? `${sessionId.slice(0, 14)}…` : sessionId;
                  const ip = s.status?.ip || '';

                  return (
                    <TableRow key={sessionId}>
                      <TableCell
                        className="w-[160px] max-w-[160px] overflow-hidden font-mono text-sm text-ellipsis whitespace-nowrap"
                        title={sessionId}>
                        {shortId}
                      </TableCell>
                      <TableCell>{ip || '—'}</TableCell>
                      <TableCell>
                        {s.status?.createdAt ? (
                          <DateFormatter
                            date={s.status.createdAt}
                            withTime="short"
                            withGMT={false}
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {s.status?.expiresAt ? (
                          <DateFormatter
                            date={s.status.expiresAt}
                            withTime="short"
                            withGMT={false}
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip message={<Trans>End session</Trans>}>
                          <Button
                            variant="destructive"
                            size="icon"
                            type="button"
                            onClick={async () => {
                              if (!userId) return;
                              await sessionDeleteMutation(userId, sessionId);
                              await query.refetch();
                            }}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
