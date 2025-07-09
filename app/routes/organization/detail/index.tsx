import type { Route } from './+types/index';
import BadgeState from '@/components/badge-state';
import CopyButton from '@/components/copy-button';
import IDDisplay from '@/components/id-display';
import { Text, Title } from '@/components/typography';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/modules/shadcn/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/modules/shadcn/ui/table';
import { Organization } from '@/resources/schemas/organization.schema';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { useRouteLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<Organization>(matches, 'routes/organization/detail/layout');
  return metaObject(`Detail - ${data?.metadata?.annotations?.['kubernetes.io/display-name']}`);
};

export default function Page() {
  const data = useRouteLoaderData('routes/organization/detail/layout') as Organization;

  return (
    <div className="m-4 flex flex-col gap-1">
      <Title>{data?.metadata?.annotations?.['kubernetes.io/display-name']}</Title>
      <Text textColor="muted">{data?.metadata?.name}</Text>

      <Card className="mt-4 shadow-none">
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">ID</Text>
                </TableCell>
                <TableCell>
                  <IDDisplay value={data?.metadata?.uid} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">Name</Text>
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
                  <Text textColor="muted">Description</Text>
                </TableCell>
                <TableCell>
                  <Text>{data?.metadata?.annotations?.['kubernetes.io/display-name']}</Text>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">Type</Text>
                </TableCell>
                <TableCell>
                  <BadgeState state={data?.spec?.type ?? 'Organization'} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">Created at</Text>
                </TableCell>
                <TableCell>
                  <Text>{data?.metadata?.creationTimestamp}</Text>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
