import type { Route } from './+types/index';
import BadgeState from '@/components/badge-state';
import { Text, Title } from '@/components/typography';
import UIDDisplay from '@/components/uid-display';
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
  const data = extractDataFromMatches<Organization>(
    matches,
    'routes/customer/organization/detail/layout'
  );
  return metaObject(`Detail - ${data?.metadata?.annotations?.['kubernetes.io/display-name']}`);
};

export default function CustomerOrganizationDetail() {
  const data = useRouteLoaderData('routes/customer/organization/detail/layout') as Organization;

  return (
    <div className="m-4 flex flex-col gap-1">
      <Title>{data?.metadata?.annotations?.['kubernetes.io/display-name']}</Title>
      <Text textColor="muted">{data?.metadata?.name}</Text>

      <Card className="mt-4 shadow-none">
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>View and manage organization information.</CardDescription>
        </CardHeader>

        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">UID</Text>
                </TableCell>
                <TableCell>
                  <UIDDisplay value={data?.metadata?.uid} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">Type</Text>
                </TableCell>
                <TableCell>
                  <BadgeState state={data?.spec?.type} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell width="25%">
                  <Text textColor="muted">Name</Text>
                </TableCell>
                <TableCell>
                  <Text>{data?.metadata?.name}</Text>
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
