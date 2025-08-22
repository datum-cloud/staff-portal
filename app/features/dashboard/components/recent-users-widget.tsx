import { BadgeState } from '@/components/badge';
import { Button } from '@/components/button';
import { DateFormatter } from '@/components/date';
import { DisplayName } from '@/components/display';
import { Text, Title } from '@/components/typography';
import { Avatar, AvatarFallback } from '@/modules/shadcn/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader } from '@/modules/shadcn/ui/card';
import { userListQuery } from '@/resources/request/client';
import { User } from '@/resources/schemas';
import { userRoutes } from '@/utils/config/routes.config';
import { Trans } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Users } from 'lucide-react';
import { useNavigate } from 'react-router';

export function RecentUsersWidget() {
  const navigate = useNavigate();
  const { data: userListData } = useQuery({
    queryKey: ['users', 'recent'],
    queryFn: () => userListQuery({ limit: 10 }),
  });

  const recentUsers = userListData?.data?.items || [];

  return (
    <Card className="md:col-span-2 lg:col-span-2 xl:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground h-4 w-4" />
            <Title level={4}>Recent Users</Title>
          </div>
          <Button
            type="secondary"
            theme="outline"
            size="small"
            icon={<ArrowRight size={16} />}
            onClick={() => navigate(userRoutes.list())}>
            <Trans>View All</Trans>
          </Button>
        </div>
        <CardDescription>
          <Text size="sm" textColor="muted">
            <Trans>Last 10 new users who joined Datum</Trans>
          </Text>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {recentUsers.length > 0 ? (
          <div className="space-y-2">
            {recentUsers.map((user: User) => (
              <div
                key={user.metadata.name}
                className="flex items-center gap-3 rounded-md border p-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs font-medium">
                    {user.spec.givenName.charAt(0)}
                    {user.spec.familyName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <DisplayName
                        displayName={`${user.spec.givenName} ${user.spec.familyName}`}
                        to={`/user/${user.metadata.name}`}
                      />
                    </div>
                    <div className="ml-3 flex items-center gap-2">
                      <BadgeState state={user.status?.state ?? 'Active'} />
                    </div>
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    <DateFormatter date={user.metadata.creationTimestamp} withTime />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Users className="text-muted-foreground mb-3 h-8 w-8" />
            <Title level={5} className="mb-1">
              <Trans>No users yet</Trans>
            </Title>
            <Text size="sm" textColor="muted">
              <Trans>Users will appear here once they join Datum</Trans>
            </Text>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
