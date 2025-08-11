import type { Route } from './+types/detail';
import { BadgeCondition } from '@/components/badge';
import { DateFormatter } from '@/components/date';
import { DisplayText } from '@/components/display';
import { Text, Title } from '@/components/typography';
import { DomainStatusProbe } from '@/features/domain';
import { authenticator } from '@/modules/auth';
import { Card, CardContent } from '@/modules/shadcn/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/modules/shadcn/ui/table';
import { projectDomainDetailQuery } from '@/resources/request/server';
import { Domain } from '@/resources/schemas';
import { useProjectDetailData } from '@/routes/project/shared';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { useLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<Domain>(matches);
  return metaObject(`Domain - ${data?.metadata?.name}`);
};

export const handle = {
  breadcrumb: (data: Domain) => <span>{data.metadata.name}</span>,
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);

  const data = await projectDomainDetailQuery(
    session?.accessToken ?? '',
    params?.projectName ?? '',
    params?.domainName ?? ''
  );

  return data;
};

export default function Page() {
  const { project } = useProjectDetailData();
  const data = useLoaderData<typeof loader>();

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
                  <Text>
                    <DisplayText value={data?.metadata?.name} withCopy />
                  </Text>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Namespace</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>{data?.metadata?.namespace}</Text>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Domain</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>{data?.spec?.domainName}</Text>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Status</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <DomainStatusProbe
                    projectName={project.metadata.name}
                    domainName={data?.metadata?.name}
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Created</Trans>
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
