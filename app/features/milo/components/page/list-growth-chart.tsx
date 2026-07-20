import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { t } from '@lingui/core/macro';
import { format } from 'date-fns';
import { useId, useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface GrowthPoint {
  month: string;
  label: string;
  cumulative: number;
}

/** Buckets creation timestamps by month into a running total, for the growth chart. */
function buildGrowthSeries(createdAts: (string | null | undefined)[]): GrowthPoint[] {
  const created = createdAts
    .map((d) => (d ? new Date(d) : null))
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
    points.push({
      month: format(cursor, 'MMM yyyy'),
      label: format(cursor, "MMM ''yy"),
      cumulative,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return points;
}

function ListGrowthChartSkeleton({ title }: { title: string }) {
  return (
    <div className="border-border flex shrink-0 items-center gap-6 border-b px-4 py-3">
      <div className="shrink-0">
        <h2 className="text-muted-foreground text-sm font-medium">{title}</h2>
        <Skeleton className="mt-1 h-7 w-10" />
      </div>
      <div className="flex h-16 min-w-0 flex-1 items-center">
        <Skeleton className="h-8 w-full max-w-md" />
      </div>
    </div>
  );
}

function GrowthTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: GrowthPoint }>;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-2.5 py-1.5 text-xs shadow-sm">
      <div className="text-muted-foreground">{point.month}</div>
      <div className="font-medium tabular-nums">{point.cumulative}</div>
    </div>
  );
}

export interface ListGrowthChartProps<T> {
  items: T[];
  /** Extracts an item's creation timestamp (ISO string), for month-bucketing. Pass a stable (module-level) function — an inline arrow defeats the memo below on every render. */
  getCreatedAt: (item: T) => string | null | undefined;
  /** e.g. "Total organizations" */
  title: string;
  /** When true, shows skeletons instead of a misleading empty/zero state. */
  loading?: boolean;
}

/**
 * Cumulative-growth strip — rendered via `ListTable`'s `toolbar` slot, so it
 * sits in the table's own right-hand column rather than spanning over the
 * filter sidebar. Shared by the Organizations/Projects/Users list pages.
 */
export function ListGrowthChart<T>({
  items,
  getCreatedAt,
  title,
  loading = false,
}: ListGrowthChartProps<T>) {
  // useId() can include colons; strip them so the SVG gradient url() resolves.
  const fillId = `growth-fill-${useId().replace(/:/g, '')}`;
  const growthData = useMemo(
    () => buildGrowthSeries(items.map(getCreatedAt)),
    [items, getCreatedAt]
  );
  const hasTrend = growthData.length >= 2;
  const endpointTicks = useMemo(
    () => (hasTrend ? [growthData[0].month, growthData[growthData.length - 1].month] : []),
    [growthData, hasTrend]
  );

  if (loading) {
    return <ListGrowthChartSkeleton title={title} />;
  }

  return (
    <div className="border-border flex shrink-0 items-center gap-6 border-b px-4 py-3">
      <div className="shrink-0">
        <h2 className="text-muted-foreground text-sm font-medium">{title}</h2>
        <span className="text-2xl font-semibold tabular-nums">{items.length}</span>
      </div>
      <div className="min-w-0 flex-1">
        {!hasTrend ? (
          <div className="text-muted-foreground flex h-16 items-center text-sm">
            {t`Not enough data yet to show a trend.`}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={64}>
            <AreaChart data={growthData} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                ticks={endpointTicks}
                tickFormatter={(value) => {
                  if (value === growthData[0].month) return growthData[0].label;
                  if (value === growthData[growthData.length - 1].month) {
                    return growthData[growthData.length - 1].label;
                  }
                  return '';
                }}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                dy={2}
              />
              <YAxis hide domain={[0, 'dataMax']} />
              <Tooltip
                content={<GrowthTooltip />}
                cursor={{ stroke: 'var(--border)', strokeDasharray: '3 3' }}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="var(--primary)"
                strokeWidth={1.75}
                fill={`url(#${fillId})`}
                activeDot={{ r: 3.5, strokeWidth: 0 }}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
