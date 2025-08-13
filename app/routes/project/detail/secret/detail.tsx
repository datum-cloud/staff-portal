import type { Route } from './+types/detail';
import { DateFormatter } from '@/components/date';
import { DisplayText } from '@/components/display';
import { Text, Title } from '@/components/typography';
import { authenticator } from '@/modules/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/modules/shadcn/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/shadcn/ui/table';
import { projectSecretDetailQuery } from '@/resources/request/server';
import { Secret } from '@/resources/schemas';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { useLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<Secret>(matches);
  return metaObject(`Secret - ${data?.metadata?.name}`);
};

export const handle = {
  breadcrumb: (data: Secret) => <span>{data.metadata.name}</span>,
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);

  const data = await projectSecretDetailQuery(
    session?.accessToken ?? '',
    params?.projectName ?? '',
    params?.secretName ?? ''
  );

  return data;
};

export default function Page() {
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
                    <Trans>Type</Trans>
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>{data?.type}</Text>
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

      <Card className="mt-4 shadow-none">
        <CardHeader>
          <CardTitle>Key-value pairs</CardTitle>
          <CardDescription>The key-value pairs securely stored as secrets.</CardDescription>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(data?.data ?? {}).map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell>{key}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
