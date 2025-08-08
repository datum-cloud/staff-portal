import type { Route } from './+types/detail';
import { BadgeCondition, BadgeState } from '@/components/badge';
import { DateFormatter } from '@/components/date';
import { DisplayText } from '@/components/display';
import { Text, Title } from '@/components/typography';
import { authenticator } from '@/modules/auth';
import { CodeEditor } from '@/modules/code-editor';
import { Button } from '@/modules/shadcn/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shadcn/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/modules/shadcn/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/shadcn/ui/table';
import { projectExportPolicyDetailQuery } from '@/resources/request/server';
import { ExportPolicy } from '@/resources/schemas';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { CodeIcon, SettingsIcon } from 'lucide-react';
import { useLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<ExportPolicy>(matches);
  return metaObject(`Export Policy - ${data?.metadata?.name}`);
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);

  const data = await projectExportPolicyDetailQuery(
    session?.accessToken ?? '',
    params?.projectName ?? '',
    params?.exportPolicyName ?? ''
  );

  return data;
};

export const handle = {
  breadcrumb: (data: ExportPolicy) => <span>{data.metadata.name}</span>,
};

export default function Page() {
  const data = useLoaderData<typeof loader>();
  console.log(data);

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
          <CardTitle>
            <Trans>Sources</Trans>
            <span className="text-muted-foreground ml-2 text-sm">
              ({data?.spec?.sources?.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans>Name</Trans>
                </TableHead>
                <TableHead>
                  <Trans>MetricsQL</Trans>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.spec?.sources?.map((source) => (
                <TableRow key={source.name}>
                  <TableCell>
                    <DisplayText value={source.name} withCopy />
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <CodeIcon className="size-4" />
                          <Trans>Query</Trans>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="min-w-[400px]">
                        <CodeEditor
                          value={source.metrics.metricsql}
                          language="promql"
                          readOnly
                          minHeight="100px"
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardHeader>
          <CardTitle>
            <Trans>Sinks</Trans>
            <span className="text-muted-foreground ml-2 text-sm">
              ({data?.spec?.sinks?.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans>Name</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Type</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Source</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Status</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Configuration</Trans>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.spec?.sinks?.map((sink) => (
                <TableRow key={sink.name}>
                  <TableCell>
                    <DisplayText value={sink.name} withCopy />
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const type = sink.target?.prometheusRemoteWrite ? 'Prometheus' : 'Unknown';
                      return <BadgeState state={type} />;
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      return sink.sources?.map((source: string) => (
                        <BadgeState state={source} key={source} />
                      ));
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const currentStatus = data.status.sinks.find((s) => s.name === sink.name);
                      return <BadgeCondition status={currentStatus} multiple={false} showMessage />;
                    })()}
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <SettingsIcon className="size-4" />
                          <Trans>Configuration</Trans>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="min-w-[500px]">
                        <CodeEditor
                          value={JSON.stringify(sink.target?.prometheusRemoteWrite, null, 2)}
                          language="json"
                          readOnly
                          minHeight="300px"
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
