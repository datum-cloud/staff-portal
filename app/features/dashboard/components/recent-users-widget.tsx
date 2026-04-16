import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { activityListQuery } from '@/resources/request/client';
import { userRoutes } from '@/utils/config/routes.config';
import { Avatar, AvatarFallback } from '@datum-cloud/datum-ui/avatar';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@datum-cloud/datum-ui/card';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { IoK8sApiserverPkgApisAuditV1Event } from '@openapi/activity.miloapis.com/v1alpha1';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Users } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';

function UserItem({ log }: { log: IoK8sApiserverPkgApisAuditV1Event }) {
  const userData = log.responseObject as any;

  if (!userData?.spec) return null;

  const { givenName, familyName } = userData?.spec ?? {};
  const initials = `${givenName?.charAt(0) || ''}${familyName?.charAt(0) || ''}`;
  const fullName = `${givenName || ''} ${familyName || ''}`.trim();

  return (
    <div key={log.user?.username} className="flex items-center gap-3 rounded-md border p-2">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs font-medium">{initials || '?'}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <DisplayName
              displayName={fullName}
              name={userData?.spec?.email}
              to={userRoutes.detail(userData?.metadata?.name || 'unknown')}
            />
          </div>
          <div className="ml-3 flex items-center gap-2">
            <Text size="sm" textColor="muted">
              <DateTime date={userData?.metadata?.creationTimestamp} />
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}

// Extracted empty state component
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Users className="text-muted-foreground mb-3 h-8 w-8" />
      <Title level={5} className="mb-1">
        <Trans>No users yet</Trans>
      </Title>
      <Text size="sm" textColor="muted">
        <Trans>Users will appear here once they join Datum</Trans>
      </Text>
    </div>
  );
}

export function RecentUsersWidget() {
  const navigate = useNavigate();

  const { data: userListData, isLoading } = useQuery({
    queryKey: ['users', 'recent'],
    queryFn: () =>
      activityListQuery('users', undefined, {
        filters: {
          actions: 'create',
          resourceType: 'users',
          status: 'success',
          start: 'now-7d',
          end: 'now',
        },
        limit: 10,
      }),
  });

  const recentUsers = useMemo(
    () => (userListData?.data?.logs || []).filter((log) => (log.responseObject as any)?.spec),
    [userListData?.data?.logs]
  );
  const handleViewAll = useMemo(() => () => navigate(userRoutes.list()), [navigate]);

  return (
    <Card className="min-w-0 md:col-span-2 lg:col-span-2 xl:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground h-4 w-4" />
            <Title level={4}>Recent Users</Title>
          </div>
          <Button
            type="secondary"
            size="small"
            icon={<ArrowRight size={16} />}
            onClick={handleViewAll}>
            <Trans>View All</Trans>
          </Button>
        </div>
        <CardDescription>
          <Text size="sm" textColor="muted">
            <Trans>Last 10 new users who joined Datum</Trans>
          </Text>
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-[180px] pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 rounded-md border p-2">
                <div className="bg-muted h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="bg-muted h-4 w-3/4 rounded" />
                  <div className="bg-muted h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : recentUsers.length > 0 ? (
          <div className="space-y-2">
            {recentUsers.map((log, index) => (
              <UserItem key={log.auditID || `user-${index}`} log={log} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </CardContent>
    </Card>
  );
}
