import type { Route } from './+types/index';
import BadgeState from '@/components/badge-state';
import CopyButton from '@/components/copy-button';
import DateFormatter from '@/components/date-formatter';
import { Text, Title } from '@/components/typography';
import { Card, CardContent } from '@/modules/shadcn/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/modules/shadcn/ui/table';
import { Organization } from '@/resources/schemas/organization.schema';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { useRouteLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<Organization>(matches, 'routes/organization/detail/layout');
  return metaObject(`Overview - ${data?.metadata?.annotations?.['kubernetes.io/display-name']}`);
};

export default function Page() {
  const data = useRouteLoaderData('routes/organization/detail/layout') as Organization;

  return (
    <div className="m-4 flex flex-col gap-1">
      <Title>{data?.metadata?.annotations?.['kubernetes.io/display-name']}</Title>

      <Card className="mt-4 shadow-none">
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">
                    <Trans>Description</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>{data?.metadata?.annotations?.['kubernetes.io/display-name']}</Text>
                </TableCell>
              </TableRow>
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
                    <Trans>Type</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <BadgeState state={data?.spec?.type ?? 'Organization'} />
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
