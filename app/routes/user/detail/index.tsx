import type { Route } from './+types/index';
import CopyButton from '@/components/copy-button';
import DateFormatter from '@/components/date-formatter';
import { Text, Title } from '@/components/typography';
import { Card, CardContent } from '@/modules/shadcn/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/modules/shadcn/ui/table';
import { User } from '@/resources/schemas/user.schema';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { useRouteLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<User>(matches, 'routes/user/detail/layout');
  return metaObject(`Detail - ${data?.spec?.givenName} ${data?.spec?.familyName}`);
};

export default function Page() {
  const data = useRouteLoaderData('routes/user/detail/layout') as User;
  return (
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
                    <CopyButton value={data?.metadata?.name} />
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
  );
}
