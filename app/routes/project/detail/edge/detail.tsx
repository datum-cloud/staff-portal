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
import { useMemo } from 'react';
import { useLoaderData } from 'react-router';

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

  return (
    <div className="m-4 grid grid-cols-2 gap-4">
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
          <CardTitle>
            <Trans>Hostnames</Trans>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {(hostnames ?? [])?.length > 0 && (
            <div className="flex flex-col gap-2">
              {hostnames?.map((val) => {
                return (
                  <div
                    key={val.hostname}
                    className="border-input bg-background flex items-center justify-between gap-2 rounded-md border p-2">
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
  );
}
