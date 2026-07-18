import { t } from '@lingui/core/macro';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface GrowthPoint {
  month: string;
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
    points.push({ month: format(cursor, 'MMM yyyy'), cumulative });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return points;
}

export interface ListGrowthChartProps<T> {
  items: T[];
  /** Extracts an item's creation timestamp (ISO string), for month-bucketing. Pass a stable (module-level) function — an inline arrow defeats the memo below on every render. */
  getCreatedAt: (item: T) => string | null | undefined;
  /** e.g. "Total organizations" */
  title: string;
}

/**
 * Cumulative-growth strip — rendered via `ListTable`'s `toolbar` slot, so it
 * sits in the table's own right-hand column rather than spanning over the
 * filter sidebar. Shared by the Organizations/Projects/Users list pages.
 */
export function ListGrowthChart<T>({ items, getCreatedAt, title }: ListGrowthChartProps<T>) {
  const growthData = useMemo(
    () => buildGrowthSeries(items.map(getCreatedAt)),
    [items, getCreatedAt]
  );
  const hasTrend = growthData.length >= 2;

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
