import type { Route } from './+types/detail';
import { BadgeState } from '@/components/badge';
import { Chip } from '@/components/chip';
import { DnsRecordStatusProbe } from '@/features/dns';
import { authenticator } from '@/modules/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shadcn/ui/card';
import { projectDnsRecordListQuery } from '@/resources/request/client';
import { projectDnsDetailQuery, projectDomainDetailQuery } from '@/resources/request/server';
import { DNSRecordFlattened } from '@/resources/schemas';
import { useProjectDetailData } from '@/routes/project/shared';
import { extractDataFromMatches, formatTTL, metaObject } from '@/utils/helpers';
import { DataTable, DataTableProvider, SimpleTable, useDataTableQuery } from '@datum-ui/data-table';
import { Text, Title } from '@datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { ComMiloapisNetworkingDnsV1Alpha1DnsZone } from '@openapi/dns.networking.miloapis.com/v1alpha1';
import { ComDatumapisNetworkingV1AlphaDomain } from '@openapi/networking.datumapis.com/v1alpha';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { useLoaderData } from 'react-router';

type DNSZoneWithDomain = {
  dns: ComMiloapisNetworkingDnsV1Alpha1DnsZone;
  domain: ComDatumapisNetworkingV1AlphaDomain;
};

type NameserverRow = {
  hostname?: string;
  ips?: Array<{
    address?: string;
    registrantName?: string;
  }>;
  registrarName?: string;
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<DNSZoneWithDomain>(matches);
  return metaObject(`DNS - ${data?.dns?.spec?.domainName}`);
};

export const handle = {
  breadcrumb: (data: DNSZoneWithDomain) => <span>{data?.dns?.spec?.domainName}</span>,
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);

  const dns = await projectDnsDetailQuery(
    session?.accessToken ?? '',
    params?.projectName ?? '',
    params?.dnsName ?? '',
    params?.namespace as string
  );

  let domain: ComDatumapisNetworkingV1AlphaDomain | undefined;
  if (dns?.status?.domainRef?.name) {
    domain = await projectDomainDetailQuery(
      session?.accessToken ?? '',
      params?.projectName ?? '',
      dns?.status?.domainRef?.name ?? '',
      params?.namespace as string
    );
  }

  return { dns, domain };
};

const dnsRecordColumnHelper = createColumnHelper<DNSRecordFlattened>();
const nameserverColumnHelper = createColumnHelper<NameserverRow>();

export default function Page() {
  const { t } = useLingui();
  const { project } = useProjectDetailData();
  const { dns, domain } = useLoaderData<typeof loader>();

  const tableState = useDataTableQuery<DNSRecordFlattened[]>({
    queryKeyPrefix: ['dns', dns?.metadata?.name ?? '', 'records'],
    fetchFn: () =>
      projectDnsRecordListQuery(
        project.metadata?.name ?? '',
        dns?.metadata?.name ?? '',
        dns?.metadata?.namespace
      ),
    useSorting: true,
  });

  const nameserverData = useMemo(
    () =>
      (domain?.status?.nameservers ?? []).map((nameserver) => ({
        ...nameserver,
        registrarName: domain?.status?.registration?.registrar?.name,
      })),
    [domain]
  );

  const dnsRecordColumns = [
    dnsRecordColumnHelper.accessor('type', {
      header: () => <Trans>Type</Trans>,
      cell: ({ getValue, row }) => (
        <div className="flex items-center gap-2">
          <BadgeState state={getValue()} message={getValue()?.toUpperCase() ?? ''} />
          <DnsRecordStatusProbe
            projectName={project.metadata?.name ?? ''}
            dnsRecordName={row.original.recordSetName ?? ''}
            namespace={dns?.metadata?.namespace ?? ''}
            initialStatus={row.original.status}
          />
        </div>
      ),
      size: 50,
    }),
    dnsRecordColumnHelper.accessor('name', {
      header: () => <Trans>Name</Trans>,
      size: 50,
    }),
    dnsRecordColumnHelper.accessor('value', {
      header: () => <Trans>Content</Trans>,
      cell: ({ row }) => {
        const { type, value } = row.original;
        const content = () => {
          // MX records: decode "preference|exchange" format
          if (type === 'MX' && value.includes('|')) {
            const [preference, exchange] = value.split('|');
            return (
              <div className="flex items-center gap-2">
                <span className="text-sm break-all">{exchange}</span>
                <BadgeState
                  state="info"
                  message={preference}
                  tooltip={t`Priority of mail servers defined by MX records. Lowest value = highest priority.`}
                />
              </div>
            );
          }

          // SOA records: parse JSON and format for display
          if (type === 'SOA') {
            try {
              const soa = JSON.parse(value);
              return (
                <Text size="sm" className="break-all">
                  {soa.mname} {soa.rname} {soa.refresh || 0} {soa.retry || 0} {soa.expire || 0}{' '}
                  {soa.ttl || 0}
                </Text>
              );
            } catch {
              // Fallback if JSON parsing fails
              return (
                <Text size="sm" className="break-all">
                  {value}
                </Text>
              );
            }
          }

          return (
            <Text size="sm" className="break-all">
              {value}
            </Text>
          );
        };

        return <div className="text-wrap break-all whitespace-normal">{content()}</div>;
      },
    }),
    dnsRecordColumnHelper.accessor('ttl', {
      header: () => <Trans>TTL</Trans>,
      size: 50,
      cell: ({ getValue }) => formatTTL(getValue()),
    }),
  ];

  const nameserverColumns = [
    nameserverColumnHelper.display({
      id: 'type',
      header: () => <Trans>Type</Trans>,
      cell: () => <BadgeState state="pending" message="NS" />,
    }),
    nameserverColumnHelper.accessor('hostname', {
      header: () => <Trans>Value</Trans>,
    }),
    nameserverColumnHelper.accessor('ips', {
      header: () => <Trans>DNS Host</Trans>,
      cell: ({ getValue }) => (
        <Chip
          items={
            getValue()?.map((ip: { registrantName?: string }) => ip.registrantName ?? '') ?? []
          }
          maxVisible={2}
          variant="outline"
          wrap={false}
        />
      ),
    }),
    nameserverColumnHelper.accessor('registrarName', {
      header: () => <Trans>Registrar</Trans>,
      cell: ({ getValue }) => <BadgeState state="pending" message={getValue() ?? ''} />,
    }),
  ];

  return (
    <div className="m-4 flex flex-col gap-1">
      <Title>{dns?.spec?.domainName}</Title>

      <Card className="mt-4 shadow-none">
        <CardHeader>
          <CardTitle>
            <Trans>DNS Records</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTableProvider<DNSRecordFlattened, DNSRecordFlattened[]>
            columns={dnsRecordColumns}
            transform={(data) => ({ rows: data || [], cursor: undefined })}
            {...tableState}>
            <div className="flex flex-col gap-2">
              <DataTable />
            </div>
          </DataTableProvider>
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardHeader>
          <CardTitle>
            <Trans>Nameservers</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleTable<NameserverRow>
            getRowId={(row) => row?.hostname ?? ''}
            columns={nameserverColumns}
            data={nameserverData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
