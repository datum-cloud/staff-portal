import { useEnv } from '@/hooks';
import { useApp } from '@/providers/app.provider';
import {
  useCreateMessageMutation,
  usePatchTicketMutation,
  useTicketDetailQuery,
} from '@/resources/request/client/queries/support.queries';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { toast } from '@datum-cloud/datum-ui/toast';
import { t } from '@lingui/core/macro';
import {
  listIamMiloapisComV1Alpha1User,
  listIamMiloapisComV1Alpha1GroupMembershipForAllNamespaces,
} from '@openapi/iam.miloapis.com/v1alpha1';
import type { ComMiloApisSupportV1Alpha1SupportTicketSpec } from '@openapi/support.miloapis.com/v1alpha1';
import { useQuery } from '@tanstack/react-query';

const STATUSES: Array<{ value: string; label: () => string }> = [
  { value: 'open', label: () => t`Open` },
  { value: 'in-progress', label: () => t`In Progress` },
  { value: 'waiting-on-customer', label: () => t`Waiting on Customer` },
  { value: 'resolved', label: () => t`Resolved` },
  { value: 'closed', label: () => t`Closed` },
];

const PRIORITIES: Array<{ value: string; label: () => string }> = [
  { value: 'low', label: () => t`Low` },
  { value: 'medium', label: () => t`Medium` },
  { value: 'high', label: () => t`High` },
  { value: 'urgent', label: () => t`Urgent` },
];

const UNASSIGNED = '__unassigned__';

function useStaffUsers() {
  const env = useEnv();
  const staffGroupName = env?.STAFF_GROUP_NAME ?? 'staff-users';
  return useQuery({
    queryKey: ['iam', 'users', 'staff-list', staffGroupName],
    queryFn: async () => {
      const [membershipsRes, usersRes] = await Promise.all([
        listIamMiloapisComV1Alpha1GroupMembershipForAllNamespaces({
          query: { fieldSelector: `spec.groupRef.name=${staffGroupName}` },
        }),
        listIamMiloapisComV1Alpha1User({}),
      ]);
      const memberships: any[] =
        (membershipsRes.data as any)?.data?.items ?? (membershipsRes.data as any)?.items ?? [];
      const staffNames = new Set<string>(
        memberships.map((m: any) => m.spec?.userRef?.name).filter(Boolean)
      );
      const allUsers: any[] =
        (usersRes.data as any)?.data?.items ?? (usersRes.data as any)?.items ?? [];
      return allUsers.filter((u: any) => staffNames.has(u.metadata.name)) as Array<{
        metadata: { name: string };
        spec: { givenName?: string; familyName?: string; email?: string };
      }>;
    },
    staleTime: 60_000,
  });
}

export function TicketActions({ ticketName }: { ticketName: string }) {
  const { data: ticket } = useTicketDetailQuery(ticketName);
  const { displayName } = useApp();
  const patch = usePatchTicketMutation(ticketName);
  const createMessage = useCreateMessageMutation(ticketName);
  const { data: staffUsers = [] } = useStaffUsers();

  async function handlePatch(fields: Partial<ComMiloApisSupportV1Alpha1SupportTicketSpec>) {
    try {
      await patch.mutateAsync(fields);
      toast.success(t`Ticket updated`);
    } catch {
      toast.error(t`Failed to update ticket`);
    }
  }

  async function handleOwnerChange(value: string) {
    const prevOwner =
      ticket?.spec.ownerRef?.displayName ||
      ticket?.spec.ownerRef?.email ||
      ticket?.spec.ownerRef?.name;

    if (value === UNASSIGNED) {
      await handlePatch({ ownerRef: null as any });
      const actor = displayName ?? 'Staff';
      const msg = prevOwner
        ? `**${actor}** unassigned this ticket (was ${prevOwner})`
        : `**${actor}** confirmed this ticket is unassigned`;
      await createMessage.mutateAsync({
        body: msg,
        authorRef: { name: 'system', displayName: 'System' },
        internal: false,
      });
      return;
    }

    const selected = staffUsers.find((u) => u.metadata.name === value);
    const newDisplayName = selected
      ? [selected.spec.givenName, selected.spec.familyName].filter(Boolean).join(' ') ||
        selected.spec.email ||
        value
      : value;

    await handlePatch({
      ownerRef: {
        name: value,
        displayName: newDisplayName,
        email: selected?.spec.email,
      },
    });

    const actor = displayName ?? 'Staff';
    const activity = prevOwner
      ? `**${actor}** reassigned this ticket from ${prevOwner} to **${newDisplayName}**`
      : `**${actor}** assigned this ticket to **${newDisplayName}**`;

    await createMessage.mutateAsync({
      body: activity,
      authorRef: { name: 'system', displayName: 'System' },
      internal: false,
    });
  }

  const currentOwner = ticket?.spec.ownerRef?.name ?? UNASSIGNED;

  return (
    <Card className="shadow-none">
      <CardHeader className="py-3">
        <CardTitle className="text-muted-foreground text-sm font-medium">{t`Actions`}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4 pb-4">
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs font-medium">{t`Owner`}</label>
          <Select value={currentOwner} onValueChange={handleOwnerChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t`Unassigned`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>
                <span className="text-muted-foreground">{t`Unassigned`}</span>
              </SelectItem>
              {staffUsers.map((u) => {
                const display =
                  [u.spec.givenName, u.spec.familyName].filter(Boolean).join(' ') ||
                  u.spec.email ||
                  u.metadata.name;
                return (
                  <SelectItem key={u.metadata.name} value={u.metadata.name}>
                    {display}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-muted-foreground text-xs font-medium">{t`Status`}</label>
          <Select
            value={ticket?.spec.status ?? 'open'}
            onValueChange={(v) => handlePatch({ status: v as any })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-muted-foreground text-xs font-medium">{t`Priority`}</label>
          <Select
            value={ticket?.spec.priority ?? 'medium'}
            onValueChange={(v) => handlePatch({ priority: v as any })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
