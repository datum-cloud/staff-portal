import type { Route } from './+types/detail';
import { BadgeState } from '@/components/badge';
import { Chip } from '@/components/chip';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { PageHeader } from '@/components/page-header';
import { SimpleTable } from '@/components/simple-table';
import { DnsRecordStatusProbe } from '@/features/dns';
import { authenticator } from '@/modules/auth';
import { useProjectDnsRecordListQuery } from '@/resources/request/client';
import { projectDnsDetailQuery, projectDomainDetailQuery } from '@/resources/request/server';
import { DNSRecordFlattened } from '@/resources/schemas';
import { useProjectDetailData } from '@/routes/project/shared';
import { extractDataFromMatches, formatTTL, metaObject } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
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
  const { t: tMacro } = useLingui();
  const { project } = useProjectDetailData();
  const { dns, domain } = useLoaderData<typeof loader>();
  const projectName = project.metadata?.name ?? '';
  const dnsName = dns?.metadata?.name ?? '';
  const namespace = dns?.metadata?.namespace ?? 'default';

  const tableQuery = useProjectDnsRecordListQuery(projectName, dnsName, namespace);

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
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Type`} />,
      cell: ({ getValue, row }) => (
        <div className="flex items-center gap-2">
          <BadgeState state={getValue()} message={getValue()?.toUpperCase() ?? ''} />
          <DnsRecordStatusProbe
            projectName={projectName}
            dnsRecordName={row.original.recordSetName ?? ''}
            namespace={namespace}
            initialStatus={row.original.status}
          />
        </div>
      ),
      size: 50,
    }),
    dnsRecordColumnHelper.accessor('name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      size: 50,
    }),
    dnsRecordColumnHelper.accessor('value', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Content`} />,
      cell: ({ row }) => {
        const { type, value } = row.original;
        const content = () => {
          if (type === 'MX' && value.includes('|')) {
            const [preference, exchange] = value.split('|');
            return (
              <div className="flex items-center gap-2">
                <span className="text-sm break-all">{exchange}</span>
                <BadgeState
                  state="info"
                  message={preference}
                  tooltip={tMacro`Priority of mail servers defined by MX records. Lowest value = highest priority.`}
                />
              </div>
            );
          }
          if (type === 'SOA') {
            try {
              const soa = JSON.parse(value);
              return (
                <Text className="text-sm break-all">
                  {soa.mname} {soa.rname} {soa.refresh || 0} {soa.retry || 0} {soa.expire || 0}{' '}
                  {soa.ttl || 0}
                </Text>
              );
            } catch {
              return <Text className="text-sm break-all">{value}</Text>;
            }
          }
          return <Text className="text-sm break-all">{value}</Text>;
        };
        return <div className="text-wrap break-all whitespace-normal">{content()}</div>;
      },
    }),
    dnsRecordColumnHelper.accessor('ttl', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`TTL`} />,
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
      <PageHeader title={dns?.spec?.domainName} />

      <Card className="mt-4 shadow-none">
        <CardHeader>
          <CardTitle>
            <Trans>DNS Records</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <DataTable.Client
            loading={tableQuery.isLoading}
            data={tableQuery.data ?? []}
            columns={dnsRecordColumns}
            pageSize={25}
            getRowId={(row) =>
              row.recordSetId ??
              `${row.recordSetName ?? ''}-${row.type}-${row.name}-${row.value}-${row.dnsZoneId}`
            }
            defaultSort={[{ id: 'name', desc: false }]}
            searchFn={(row, search) => {
              const q = search.trim().toLowerCase();
              if (!q) return true;
              return [row.type, row.name, row.value]
                .map((v) => (v ?? '').toLowerCase())
                .some((v) => v.includes(q));
            }}>
            <div className="flex flex-col gap-2 pt-2">
              <DataTableToolbar
                search={
                  <DataTable.Search
                    placeholder={t`Search records...`}
                    className="w-full max-w-md"
                  />
                }
              />
              <DataTable.Content
                headerClassName="bg-muted/50"
                className="border-t border-b border-solid"
                emptyMessage={t`No DNS records found.`}
              />
              <DataTable.Pagination className="pb-0" />
            </div>
          </DataTable.Client>
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
