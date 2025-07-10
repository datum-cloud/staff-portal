import type { Route } from './+types/index';
import CopyButton from '@/components/copy-button';
import DateFormatter from '@/components/date-formatter';
import { Text, Title } from '@/components/typography';
import { Card, CardContent } from '@/modules/shadcn/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/modules/shadcn/ui/table';
import { Project } from '@/resources/schemas/project.schema';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { Link, useRouteLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<Project>(matches, 'routes/project/detail/layout');
  return metaObject(`Detail - ${data?.metadata?.name}`);
};

export default function Page() {
  const data = useRouteLoaderData('routes/project/detail/layout') as Project;

  return (
    <div className="m-4 flex flex-col gap-1">
      <Title>{data?.metadata?.name}</Title>
      <Text textColor="muted">{data?.metadata?.annotations?.['kubernetes.io/description']}</Text>

      <Card className="mt-4 shadow-none">
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Name</Trans>
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
                    <Trans>Organization</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <Link to={`/organizations/${data?.spec?.ownerRef?.name}`}>
                    {data?.spec?.ownerRef?.name}
                  </Link>
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
