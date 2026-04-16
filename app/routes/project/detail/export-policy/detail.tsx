import type { Route } from './+types/detail';
import { BadgeCondition, BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { DisplayText } from '@/components/display';
import { PageHeader } from '@/components/page-header';
import { authenticator } from '@/modules/auth';
import { projectExportPolicyDetailQuery } from '@/resources/request/server';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { CodeEditor, type EditorLanguage } from '@datum-cloud/datum-ui/code-editor';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { ComMiloapisTelemetryV1Alpha1ExportPolicy } from '@openapi/telemetry.miloapis.com/v1alpha1';
import { CodeIcon, SettingsIcon } from 'lucide-react';
import { useLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<ComMiloapisTelemetryV1Alpha1ExportPolicy>(matches);
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
  breadcrumb: (data: ComMiloapisTelemetryV1Alpha1ExportPolicy) => (
    <span>{data?.metadata?.name ?? ''}</span>
  ),
};

export default function Page() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="m-4 flex flex-col gap-1">
      <PageHeader title={data?.metadata?.name} />

      <Card className="mt-4 shadow-none">
        <CardContent>
          <DescriptionList
            items={[
              {
                label: <Trans>Name</Trans>,
                value: (
                  <Text>
                    <DisplayText value={data?.metadata?.name ?? ''} withCopy />
                  </Text>
                ),
              },
              {
                label: <Trans>Namespace</Trans>,
                value: <Text>{data?.metadata?.namespace}</Text>,
              },
              {
                label: <Trans>Status</Trans>,
                value: (
                  <Text>
                    <BadgeCondition status={data?.status} multiple={false} showMessage />
                  </Text>
                ),
              },
              {
                label: <Trans>Created</Trans>,
                value: (
                  <Text>
                    <DateTime date={data?.metadata?.creationTimestamp} variant="both" />
                  </Text>
                ),
              },
            ]}
          />
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
                        <Button theme="outline" size="small">
                          <CodeIcon className="size-4" />
                          <Trans>Query</Trans>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="min-w-[400px]">
                        <CodeEditor
                          value={source.metrics?.metricsql ?? ''}
                          language={'promql' as unknown as EditorLanguage}
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
                      const currentStatus = data?.status?.sinks?.find((s) => s.name === sink.name);
                      return <BadgeCondition status={currentStatus} multiple={false} showMessage />;
                    })()}
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button theme="outline" size="small">
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
