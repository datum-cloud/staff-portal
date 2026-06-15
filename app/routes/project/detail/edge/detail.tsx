import type { Route } from './+types/detail';
import { BadgeCondition, BadgeState } from '@/components/badge';
import { ButtonCopy } from '@/components/button';
import { DateTime } from '@/components/date';
import { authenticator } from '@/modules/auth';
import { projectEdgeDetailQuery } from '@/resources/request/server';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Table, TableBody, TableCell, TableRow } from '@datum-cloud/datum-ui/table';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { ComDatumapisNetworkingV1AlphaHttpProxy } from '@openapi/networking.datumapis.com/v1alpha';
import { dump } from 'js-yaml';
import { lazy, Suspense, useMemo } from 'react';
import { useLoaderData, useParams } from 'react-router';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<ComDatumapisNetworkingV1AlphaHttpProxy>(matches);
  return metaObject(`AI Edge - ${data?.metadata?.name}`);
};

export const handle = {
  breadcrumb: (data: ComDatumapisNetworkingV1AlphaHttpProxy) => (
    <span>{data?.metadata?.name ?? ''}</span>
  ),
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);

  const data = await projectEdgeDetailQuery(
    session?.accessToken ?? '',
    params?.projectName ?? '',
    params?.edgeName ?? ''
  );

  return data;
};

export default function Page() {
  const data = useLoaderData<typeof loader>();
  const { projectName } = useParams();

  const hostnames: { hostname: string; valid: boolean; message?: string }[] = useMemo(() => {
    const defaultHostnames = data?.status?.hostnames ?? [];

    const system =
      defaultHostnames.map((hostname) => {
        return {
          hostname,
          valid: true,
        };
      }) ?? [];

    const custom =
      (data?.spec?.hostnames ?? [])
        ?.filter((hostname) => !defaultHostnames.includes(hostname))
        ?.map((hostname) => {
          const hostNameCondition = data?.status?.conditions?.find(
            (condition) => condition.type === 'HostnamesVerified' && condition.status === 'False'
          );
          const valid = !hostNameCondition?.message.includes('hostname');
          return {
            hostname,
            valid,
            message: valid ? undefined : hostNameCondition?.message,
          };
        }) ?? [];

    return [...system, ...custom];
  }, [data?.status, data?.spec]);

  const lastModified = useMemo(() => {
    const managedFields = (data as any)?.metadata?.managedFields as { time?: string }[] | undefined;
    if (!managedFields?.length) return undefined;
    const times = managedFields
      .map((f) => f.time)
      .filter((t): t is string => !!t)
      .map((t) => new Date(t).getTime());
    if (!times.length) return undefined;
    return new Date(Math.max(...times)).toISOString();
  }, [data]);

  const canonicalAddress = (data as any)?.status?.addresses?.[0]?.value as string | undefined;

  const routeCount = useMemo(() => {
    const rules = data?.spec?.rules ?? [];
    const endpoints = new Set<string>();
    for (const rule of rules) {
      for (const backend of rule.backends ?? []) {
        if (backend.endpoint) endpoints.add(backend.endpoint);
      }
    }
    return endpoints.size;
  }, [data?.spec?.rules]);

  const firstRuleForHostname = useMemo(() => {
    const rules = data?.spec?.rules ?? [];
    // Return first rule that has at least one backend with an endpoint
    return rules.find((rule) => (rule.backends ?? []).some((b) => b.endpoint));
  }, [data?.spec?.rules]);

  const hostnameStatuses = (data as any)?.status?.hostnameStatuses as
    | { hostname: string; conditions?: { type: string; status: string }[] }[]
    | undefined;

  const yamlConfig = useMemo(() => {
    if (!data) return '';
    const { metadata: { managedFields, ...metadata } = {}, ...rest } = data as any;
    const strippedManagedFields = managedFields?.map(
      ({ manager, operation, apiVersion, time }: any) => ({ manager, operation, apiVersion, time })
    );
    return dump(
      { ...rest, metadata: { ...metadata, managedFields: strippedManagedFields } },
      { lineWidth: -1 }
    );
  }, [data]);

  return (
    <div className="m-4 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>
              <Trans>General</Trans>
            </CardTitle>
          </CardHeader>

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
                      {data?.spec?.rules.map(
                        (rule) => rule.backends?.map((backend) => backend.endpoint).join(', ') ?? ''
                      )}
                    </Text>
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
                      <Trans>Edge ID</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text>{data?.metadata?.uid}</Text>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Last Modified</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text>
                      <DateTime date={lastModified} variant="both" />
                    </Text>
                  </TableCell>
                </TableRow>
                {canonicalAddress && (
                  <TableRow>
                    <TableCell width="25%">
                      <Text textColor="muted">
                        <Trans>Canonical Address</Trans>
                      </Text>
                    </TableCell>
                    <TableCell>
                      <Text>{canonicalAddress}</Text>
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Created</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text>
                      <DateTime date={data?.metadata?.creationTimestamp} variant="both" />
                    </Text>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                <Trans>Hostnames &amp; Routing</Trans>
              </CardTitle>
              {routeCount > 0 && (
                <Text textColor="muted" className="text-sm">
                  {routeCount} {routeCount === 1 ? 'route' : 'routes'}
                </Text>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {(hostnames ?? [])?.length > 0 && (
              <div className="flex flex-col gap-2">
                {hostnames?.map((val) => {
                  const routeLabel = (() => {
                    const rule = firstRuleForHostname;
                    if (!rule) return null;
                    const path = (rule as any).matches?.[0]?.path;
                    const backend = (rule.backends ?? []).find((b) => b.endpoint);
                    if (!backend?.endpoint) return null;
                    const pathValue = path?.value ?? '/';
                    const isExact = path?.type === 'Exact';
                    return `${pathValue}${isExact ? '' : '*'} → ${backend.endpoint}`;
                  })();

                  const hostnameStatus = hostnameStatuses?.find((s) => s.hostname === val.hostname);
                  const certCondition = hostnameStatus?.conditions?.find(
                    (c) => c.type === 'CertificateReady'
                  );
                  const tlsBadge = (() => {
                    if (!certCondition) return null;
                    if (certCondition.status === 'True') {
                      return <BadgeState state="success" message="TLS" className="text-xs" />;
                    }
                    if (certCondition.status === 'False') {
                      return <BadgeState state="error" message="TLS" className="text-xs" />;
                    }
                    return null;
                  })();

                  return (
                    <div
                      key={val.hostname}
                      className="border-input bg-background flex items-center justify-between gap-2 rounded-md border p-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Tooltip message={val.valid ? 'Valid' : val.message}>
                            <div className="inline-flex cursor-help">
                              <BadgeState
                                state={val.valid ? 'success' : 'error'}
                                message={val.valid ? 'HTTP/HTTPS' : 'Invalid'}
                              />
                            </div>
                          </Tooltip>
                          <span className="text-sm font-medium">{val.hostname}</span>
                          {tlsBadge}
                        </div>
                        {routeLabel && (
                          <code className="text-muted-foreground text-xs">{routeLabel}</code>
                        )}
                      </div>
                      <ButtonCopy value={val.hostname} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>
            <Trans>Configuration</Trans>
          </CardTitle>
          <code className="text-muted-foreground bg-muted flex-1 truncate rounded px-2 py-1 text-xs">
            {`datumctl get httpproxies --project ${projectName} ${data?.metadata?.name} -o yaml`}
          </code>
          <ButtonCopy
            value={`datumctl get httpproxies --project ${projectName} ${data?.metadata?.name} -o yaml`}
            tooltipText="Copy command"
          />
          <ButtonCopy value={yamlConfig} tooltipText="Copy YAML" />
        </CardHeader>
        <CardContent className="p-0">
          <Suspense fallback={<div className="bg-muted h-[500px] animate-pulse rounded-md" />}>
            <MonacoEditor
              height="500px"
              language="yaml"
              theme="vs-dark"
              value={yamlConfig}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                lineNumbers: 'on',
                wordWrap: 'on',
                renderLineHighlight: 'none',
                scrollbar: { vertical: 'auto', horizontal: 'hidden' },
              }}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
