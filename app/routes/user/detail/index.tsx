import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { ButtonCopy, ButtonDeleteAction } from '@/components/button';
import { DateFormatter } from '@/components/date';
import { Text, Title } from '@/components/typography';
import { Card, CardContent } from '@/modules/shadcn/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/modules/shadcn/ui/table';
import { toast } from '@/modules/toast';
import { userDeleteMutation } from '@/resources/request/client';
import { User } from '@/resources/schemas';
import { userRoutes } from '@/utils/config/routes.config';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans, useLingui } from '@lingui/react/macro';
import { useNavigate, useRouteLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<User>(matches, 'routes/user/detail/layout');
  return metaObject(`Detail - ${data?.spec?.givenName} ${data?.spec?.familyName}`);
};

export default function Page() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const data = useRouteLoaderData('routes/user/detail/layout') as User;

  const handleDeleteUser = async () => {
    try {
      await userDeleteMutation(data.metadata.name);
      navigate(userRoutes.list());
      toast.success(t`User deleted successfully`);
    } catch (error) {
      toast.error(t`Failed to delete user`);
    }
  };

  return (
    <>
      <AppActionBar>
        <ButtonDeleteAction
          itemType="User"
          description={t`Are you sure you want to delete user "${data.spec.givenName} ${data.spec.familyName}"? This action cannot be undone.`}
          onConfirm={handleDeleteUser}
        />
      </AppActionBar>
      <div className="m-4 flex flex-col gap-1">
        <Title>
          {data?.spec?.givenName} {data?.spec?.familyName}
        </Title>
        <Text textColor="muted">{data?.spec?.email}</Text>

        <Card className="mt-4 shadow-none">
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>ID</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Text>{data?.metadata?.name}</Text>
                      <ButtonCopy value={data?.metadata?.name} />
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Full Name</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text>
                      {data?.spec?.givenName} {data?.spec?.familyName}
                    </Text>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Email</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text>{data?.spec?.email}</Text>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Created at</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text>
                      <DateFormatter date={data?.metadata?.creationTimestamp} withTime />
                    </Text>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
