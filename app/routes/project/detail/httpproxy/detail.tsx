import type { Route } from './+types/detail';
import BadgeCondition from '@/components/badge-condition';
import DateFormatter from '@/components/date-formatter';
import { Text, Title } from '@/components/typography';
import { authenticator } from '@/modules/auth';
import { Card, CardContent } from '@/modules/shadcn/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/modules/shadcn/ui/table';
import { projectHttpProxyDetailQuery } from '@/resources/request/server/project.request';
import { HTTPProxy } from '@/resources/schemas/httpproxy.schema';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { useLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<HTTPProxy>(matches);
  return metaObject(`HTTPProxy - ${data?.metadata?.name}`);
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);

  const data = await projectHttpProxyDetailQuery(
    session?.accessToken ?? '',
    params?.projectName ?? '',
    params?.httpProxyName ?? ''
  );

  return data;
};

export const handle = {
  breadcrumb: (data: HTTPProxy) => <span>{data.metadata.name}</span>,
};

export default function Page() {
  const data = useLoaderData() as HTTPProxy;

  return (
    <div className="m-4 flex flex-col gap-1">
      <Title>{data?.metadata?.name}</Title>

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
                  <Text>{data?.metadata?.name}</Text>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Endpoint</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>
                    {data?.spec?.rules.map((rule) =>
                      rule.backends.map((backend) => backend.endpoint).join(', ')
                    )}
                  </Text>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Hostname</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    {data?.status?.hostnames?.map((hostname) => (
                      <Text key={hostname}>{hostname}</Text>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Status</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>
                    <BadgeCondition status={data?.status} multiple={false} showMessage />
                  </Text>
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
