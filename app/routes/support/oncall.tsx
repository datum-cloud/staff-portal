import { useEnv } from '@/hooks/use-env';
import { metaObject } from '@/utils/helpers';
import { Avatar, AvatarFallback } from '@datum-cloud/datum-ui/avatar';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@datum-cloud/datum-ui/card';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
import {
  createIamMiloapisComV1Alpha1NamespacedGroupMembership,
  deleteIamMiloapisComV1Alpha1NamespacedGroupMembership,
  listIamMiloapisComV1Alpha1NamespacedGroupMembership,
  listIamMiloapisComV1Alpha1User,
  patchIamMiloapisComV1Alpha1NamespacedGroup,
  readIamMiloapisComV1Alpha1NamespacedGroup,
} from '@openapi/iam.miloapis.com/v1alpha1';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  PhoneCall,
  UserMinus,
  UserPlus,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

export const meta = () => metaObject(t`On-Call`);

const NAMESPACE = 'milo-system';
const ROTATION_ANNOTATION = 'support.miloapis.com/rotation';

// ── Rotation helpers ─────────────────────────────────────────────────────────

interface RotationConfig {
  users: string[];
  anchorWeek: number; // ISO week index from 2024-01-01
}

const EPOCH = new Date('2024-01-01T00:00:00Z').getTime();

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = start
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function weekIndex(date: Date): number {
  return Math.floor((getWeekStart(date).getTime() - EPOCH) / (7 * 864e5));
}

function weekLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

function getSchedule(config: RotationConfig, weeks = 8) {
  if (!config.users.length) return [];
  const now = new Date();
  const currentWeekIdx = weekIndex(now);
  return Array.from({ length: weeks }, (_, i) => {
    const wi = currentWeekIdx + i;
    const pos =
      (((wi - config.anchorWeek) % config.users.length) + config.users.length) %
      config.users.length;
    const ws = new Date(EPOCH + wi * 7 * 864e5);
    return { weekStart: ws, label: weekLabel(ws), user: config.users[pos], isCurrent: i === 0 };
  });
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useOnCallMembers(groupName: string) {
  return useQuery({
    queryKey: ['iam', 'oncall', 'members', groupName],
    queryFn: async () => {
      const response = await listIamMiloapisComV1Alpha1NamespacedGroupMembership({
        path: { namespace: NAMESPACE },
        query: { fieldSelector: `spec.groupRef.name=${groupName}` },
      });
      return (response.data as any)?.data?.items ?? [];
    },
    enabled: !!groupName,
  });
}

function useStaffUsers() {
  return useQuery({
    queryKey: ['iam', 'users', 'all'],
    queryFn: async () => {
      const response = await listIamMiloapisComV1Alpha1User({});
      return (response.data as any)?.data?.items ?? [];
    },
  });
}

function useRotationConfig(groupName: string) {
  return useQuery({
    queryKey: ['iam', 'oncall', 'rotation', groupName],
    queryFn: async () => {
      const response = await readIamMiloapisComV1Alpha1NamespacedGroup({
        path: { namespace: NAMESPACE, name: groupName },
      });
      const annotations = (response.data as any)?.data?.metadata?.annotations ?? {};
      const raw = annotations[ROTATION_ANNOTATION];
      if (!raw) return { users: [], anchorWeek: weekIndex(new Date()) } as RotationConfig;
      return JSON.parse(raw) as RotationConfig;
    },
    enabled: !!groupName,
  });
}

function useUpdateRotation(groupName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: RotationConfig) => {
      await patchIamMiloapisComV1Alpha1NamespacedGroup({
        path: { namespace: NAMESPACE, name: groupName },
        body: [
          {
            op: 'add',
            path: `/metadata/annotations/${ROTATION_ANNOTATION.replace(/\//g, '~1')}`,
            value: JSON.stringify(config),
          },
        ] as any,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'oncall', 'rotation', groupName] }),
  });
}

function useAddOnCall(groupName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userName: string) => {
      await createIamMiloapisComV1Alpha1NamespacedGroupMembership({
        path: { namespace: NAMESPACE },
        body: {
          apiVersion: 'iam.miloapis.com/v1alpha1',
          kind: 'GroupMembership',
          metadata: { generateName: 'oncall-', namespace: NAMESPACE },
          spec: {
            groupRef: { name: groupName, namespace: NAMESPACE },
            userRef: { name: userName },
          },
        } as any,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'oncall', 'members', groupName] }),
  });
}

function useRemoveOnCall(groupName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (membershipName: string) => {
      await deleteIamMiloapisComV1Alpha1NamespacedGroupMembership({
        path: { namespace: NAMESPACE, name: membershipName },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['iam', 'oncall', 'members', groupName] }),
  });
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OnCallPage() {
  const { t } = useLingui();
  const env = useEnv();
  const groupName = env?.ONCALL_GROUP_NAME ?? 'support-oncall';

  const { data: members = [], isLoading: membersLoading } = useOnCallMembers(groupName);
  const { data: allUsers = [] } = useStaffUsers();
  const { data: rotation } = useRotationConfig(groupName);
  const updateRotation = useUpdateRotation(groupName);
  const addMember = useAddOnCall(groupName);
  const removeMember = useRemoveOnCall(groupName);

  const [selectedUser, setSelectedUser] = useState('');
  const [rotationUserToAdd, setRotationUserToAdd] = useState('');

  const memberUserNames = new Set(members.map((m: any) => m.spec?.userRef?.name));
  const availableUsers = allUsers.filter((u: any) => !memberUserNames.has(u.metadata?.name));

  const schedule = rotation ? getSchedule(rotation) : [];
  const thisWeekUser = schedule[0]?.user;
  const scheduleMatchesActive =
    thisWeekUser && memberUserNames.has(thisWeekUser) && memberUserNames.size === 1;

  const allUserNames: string[] = allUsers.map((u: any) => u.metadata?.name ?? '').filter(Boolean);
  const rotationUsers = rotation?.users ?? [];
  const usersNotInRotation = allUserNames.filter((n) => !rotationUsers.includes(n));

  function moveInRotation(index: number, dir: -1 | 1) {
    if (!rotation) return;
    const users = [...rotation.users];
    const target = index + dir;
    if (target < 0 || target >= users.length) return;
    [users[index], users[target]] = [users[target], users[index]];
    updateRotation.mutate({ ...rotation, users });
  }

  function removeFromRotation(index: number) {
    if (!rotation) return;
    const users = rotation.users.filter((_, i) => i !== index);
    updateRotation.mutate({ ...rotation, users });
  }

  function addToRotation() {
    if (!rotationUserToAdd || !rotation) return;
    const users = [...rotation.users, rotationUserToAdd];
    updateRotation.mutate({ ...rotation, users });
    setRotationUserToAdd('');
  }

  async function applySchedule() {
    if (!thisWeekUser) return;
    // Remove all current members, then add the scheduled user
    await Promise.all(members.map((m: any) => removeMember.mutateAsync(m.metadata?.name)));
    await addMember.mutateAsync(thisWeekUser);
  }

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div>
        <Title level={3} className="flex items-center gap-2">
          <PhoneCall className="h-5 w-5" />
          <Trans>On-Call Roster</Trans>
        </Title>
        <Text size="sm" textColor="muted">
          <Trans>
            On-call staff receive badge notifications for new support tickets. Group:{' '}
            <code className="font-mono">{groupName}</code>
          </Trans>
        </Text>
      </div>

      {/* Current on-call */}
      <Card>
        <CardHeader className="pb-3">
          <Title level={5}>
            <Trans>Current On-Call</Trans>
          </Title>
          <CardDescription>
            <Text size="sm" textColor="muted">
              <Plural value={members.length} one="# member" other="# members" />
            </Text>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {membersLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex animate-pulse items-center gap-3 rounded-md border p-3">
                  <div className="bg-muted h-8 w-8 rounded-full" />
                  <div className="bg-muted h-4 w-40 rounded" />
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <PhoneCall className="text-muted-foreground mb-2 h-8 w-8" />
              <Text size="sm" textColor="muted">
                <Trans>No one is on call. Add staff members below.</Trans>
              </Text>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member: any) => {
                const userName = member.spec?.userRef?.name ?? '';
                const initials = userName.slice(0, 2).toUpperCase();
                return (
                  <div
                    key={member.metadata?.name}
                    className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                      </Avatar>
                      <Text size="sm">{userName}</Text>
                    </div>
                    <Button
                      type="secondary"
                      size="small"
                      icon={<UserMinus size={14} />}
                      onClick={() => removeMember.mutate(member.metadata?.name)}
                      disabled={removeMember.isPending}>
                      <Trans>Remove</Trans>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add to on-call */}
      <Card>
        <CardHeader className="pb-3">
          <Title level={5}>
            <Trans>Add to On-Call</Trans>
          </Title>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="border-input bg-background flex-1 rounded-md border px-3 py-2 text-sm">
              <option value="">{t`Select a user…`}</option>
              {availableUsers.map((u: any) => {
                const name = u.metadata?.name ?? '';
                const display =
                  [u.spec?.givenName, u.spec?.familyName].filter(Boolean).join(' ') || name;
                return (
                  <option key={name} value={name}>
                    {display} ({name})
                  </option>
                );
              })}
            </select>
            <Button
              type="primary"
              size="small"
              icon={<UserPlus size={14} />}
              disabled={!selectedUser || addMember.isPending}
              onClick={() => {
                if (selectedUser) {
                  addMember.mutate(selectedUser);
                  setSelectedUser('');
                }
              }}>
              <Trans>Add</Trans>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rotation schedule */}
      <Card>
        <CardHeader className="pb-3">
          <Title level={5} className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            <Trans>Rotation Schedule</Trans>
          </Title>
          <CardDescription>
            <Text size="sm" textColor="muted">
              <Trans>
                Define a recurring rotation. The scheduled person can be activated with one click.
              </Trans>
            </Text>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Upcoming schedule */}
          {rotation && rotation.users.length > 0 ? (
            <div className="divide-y rounded-md border text-sm">
              {schedule.map(({ label, user, isCurrent }) => (
                <div
                  key={label}
                  className={`flex items-center justify-between px-3 py-2 ${isCurrent ? 'bg-muted/50' : ''}`}>
                  <div className="flex items-center gap-2">
                    {isCurrent && <span className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />}
                    <span className={isCurrent ? 'font-medium' : 'text-muted-foreground'}>
                      {label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={isCurrent ? 'font-medium' : 'text-muted-foreground'}>
                      {user}
                    </span>
                    {isCurrent && !scheduleMatchesActive && (
                      <Button
                        type="primary"
                        size="small"
                        onClick={applySchedule}
                        disabled={addMember.isPending || removeMember.isPending}>
                        <Trans>Activate</Trans>
                      </Button>
                    )}
                    {isCurrent && scheduleMatchesActive && (
                      <span className="text-xs font-medium text-green-600">
                        <Trans>Active</Trans>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-2 text-sm">
              <Trans>No rotation configured. Add users to the rotation below.</Trans>
            </p>
          )}

          {/* Rotation order editor */}
          {rotationUsers.length > 0 && (
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                <Trans>Rotation order</Trans>
              </p>
              {rotationUsers.map((userName, i) => (
                <div
                  key={userName}
                  className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                  <span className="text-muted-foreground w-4 text-xs">{i + 1}.</span>
                  <span className="flex-1">{userName}</span>
                  <button
                    type="button"
                    onClick={() => moveInRotation(i, -1)}
                    disabled={i === 0}
                    className="text-muted-foreground hover:text-foreground p-0.5 disabled:opacity-30">
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveInRotation(i, 1)}
                    disabled={i === rotationUsers.length - 1}
                    className="text-muted-foreground hover:text-foreground p-0.5 disabled:opacity-30">
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromRotation(i)}
                    className="text-muted-foreground hover:text-destructive p-0.5">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add to rotation */}
          {usersNotInRotation.length > 0 && (
            <div className="flex gap-2">
              <select
                value={rotationUserToAdd}
                onChange={(e) => setRotationUserToAdd(e.target.value)}
                className="border-input bg-background flex-1 rounded-md border px-3 py-2 text-sm">
                <option value="">{t`Add user to rotation…`}</option>
                {usersNotInRotation.map((name) => {
                  const u = allUsers.find((u: any) => u.metadata?.name === name);
                  const display = u
                    ? [u.spec?.givenName, u.spec?.familyName].filter(Boolean).join(' ') || name
                    : name;
                  return (
                    <option key={name} value={name}>
                      {display} ({name})
                    </option>
                  );
                })}
              </select>
              <Button
                type="secondary"
                size="small"
                disabled={!rotationUserToAdd || updateRotation.isPending}
                onClick={addToRotation}>
                <Trans>Add</Trans>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
