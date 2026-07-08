import type { Route } from './+types/index';
import { DateTime } from '@/components/date';
import { DisplayId } from '@/components/display';
import { DATE_RANGE_OPTIONS, ListPage, ListTable } from '@/features/milo';
import { type GqlOrganization, useAllOrganizationsQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Building2, User } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Organizations`);
};

const columnHelper = createColumnHelper<GqlOrganization>();

interface GrowthPoint {
  month: string;
  cumulative: number;
}

/** Buckets organizations by creation month into a running total, for the growth chart. */
function buildGrowthSeries(orgs: GqlOrganization[]): GrowthPoint[] {
  const created = orgs
    .map((o) => (o.createdAt ? new Date(o.createdAt) : null))
    .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (created.length === 0) return [];

  const points: GrowthPoint[] = [];
  let cumulative = 0;
  let index = 0;
  const cursor = new Date(created[0].getFullYear(), created[0].getMonth(), 1);
  const end = new Date();

  while (cursor <= end) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    while (index < created.length && created[index] < monthEnd) {
      cumulative++;
      index++;
    }
    points.push({ month: format(cursor, 'MMM yyyy'), cumulative });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return points;
}

/**
 * Cumulative-growth strip — rendered via `ListTable`'s `toolbar` slot, so it
 * sits in the table's own right-hand column rather than spanning over the
 * filter sidebar. Mirrors the Projects page's growth chart.
 */
function OrganizationsGrowthChart({ orgs }: { orgs: GqlOrganization[] }) {
  const growthData = useMemo(() => buildGrowthSeries(orgs), [orgs]);
  const hasTrend = growthData.length >= 2;

  return (
    <div className="flex shrink-0 items-center gap-6 border-b px-4 py-3">
      <div className="shrink-0">
        <h2 className="text-muted-foreground text-sm font-medium">{t`Total organizations`}</h2>
        <span className="text-2xl font-semibold tabular-nums">{orgs.length}</span>
      </div>
      <div className="min-w-0 flex-1">
        {!hasTrend ? (
          <div className="text-muted-foreground flex h-16 items-center text-sm">
            {t`Not enough data yet to show a trend.`}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={64}>
            <LineChart data={growthData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                minTickGap={24}
              />
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Tooltip labelFormatter={(month) => month} formatter={(value) => [value, t`Total`]} />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="var(--primary)"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  const tableQuery = useAllOrganizationsQuery();
  const orgs = useMemo(() => tableQuery.data?.items ?? [], [tableQuery.data]);

  const columns = [
    columnHelper.accessor('name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => (
        <Link to={`./${row.original.name}`}>{row.original.displayName || row.original.name}</Link>
      ),
    }),
    columnHelper.accessor('name', {
      id: 'id',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`ID`} />,
      cell: ({ getValue }) => <DisplayId value={getValue() ?? ''} />,
    }),
    columnHelper.accessor('createdAt', {
      id: 'createdAt',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue() ?? undefined} />,
    }),
  ];

  return (
    <ListPage>
      <ListTable
        loading={tableQuery.isLoading}
        data={orgs}
        columns={columns}
        pageSize={50}
        getRowId={(row) => row.name}
        defaultSort={[{ id: 'createdAt', desc: true }]}
        searchPlaceholder={t`Search organizations...`}
        emptyMessage={t`No organizations found.`}
        hasMore={tableQuery.data?.hasMore ?? false}
        hasMoreMessage={t`Limited to 10,000 organizations. Refine your search to surface others.`}
        toolbar={<OrganizationsGrowthChart orgs={orgs} />}
        filters={[
          {
            column: 'type',
            label: t`Type`,
            options: [
              { value: 'Personal', label: t`Personal`, icon: <User /> },
              { value: 'Standard', label: t`Standard`, icon: <Building2 /> },
            ],
          },
          {
            column: 'createdAt',
            label: t`Created`,
            type: 'dateRange',
            options: DATE_RANGE_OPTIONS,
          },
        ]}
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return (
            row.name.toLowerCase().includes(q) ||
            row.displayName.toLowerCase().includes(q) ||
            row.type.toLowerCase().includes(q)
          );
        }}
      />
    </ListPage>
  );
}
