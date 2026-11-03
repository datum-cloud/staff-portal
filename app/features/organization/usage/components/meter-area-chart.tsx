import { formatAxisValue, formatByUnit } from '../usage.format';
import type { MeterPoint, MeterUnit } from '../usage.types';
import { Text } from '@datum-cloud/datum-ui/typography';
import { format } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const STACK_COLORS = ['var(--primary)', '#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#ec4899'];

/** Extra height for the legend under a stacked chart. */
const STACK_LEGEND_HEIGHT = 28;

export interface MeterStack {
  /** Group values, one area each, in stacking order. */
  keys: string[];
  /** One row per day: `timestamp` plus a value per key. */
  data: Record<string, number>[];
}

interface MeterAreaChartProps {
  /** Unique on the page: names the chart's gradient. */
  id: string;
  label: string;
  unit: MeterUnit;
  /** Daily values for the single-series chart. */
  series: MeterPoint[];
  /** Draw the breakdown as stacked areas instead of `series`. */
  stack?: MeterStack | null;
  height?: number;
  /** A dot on each day of the single-series chart. */
  showDots?: boolean;
}

/**
 * A meter's daily usage as a filled area chart, or one dimension's groups
 * stacked. Used by the org usage page's meter cards and the billing account
 * dashboard's usage card.
 */
export function MeterAreaChart({
  id,
  label,
  unit,
  series,
  stack,
  height = 220,
  showDots = true,
}: MeterAreaChartProps) {
  const isStackedChart = Boolean(stack && stack.keys.length > 0);
  const chartData = isStackedChart && stack ? stack.data : series;
  const fillId = `usage-fill-${id}`.replace(/[^a-zA-Z0-9_-]/g, '-');

  return (
    <div className="w-full min-w-0">
      <ResponsiveContainer
        width="100%"
        height={isStackedChart ? height + STACK_LEGEND_HEIGHT : height}>
        <AreaChart
          data={chartData as Record<string, number>[]}
          margin={{
            top: 4,
            right: 8,
            left: 0,
            bottom: isStackedChart ? 20 : 0,
          }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(ts) => format(new Date(ts), 'MMM d')}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value) => formatAxisValue(unit, typeof value === 'number' ? value : 0)}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: 'var(--border)' }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="border-border bg-background rounded-md border px-2.5 py-1.5 shadow-sm">
                  <Text as="div" size="xs" textColor="muted">
                    {format(new Date(label as number), 'MMM d, yyyy')}
                  </Text>
                  {isStackedChart && stack ? (
                    <div className="mt-1 flex flex-col gap-0.5">
                      {payload.map((entry) => (
                        <Text
                          as="div"
                          size="xs"
                          textColor="default"
                          className="flex items-center gap-1.5"
                          key={entry.dataKey as string}>
                          <span
                            className="size-2 shrink-0 rounded-[2px]"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-muted-foreground">{String(entry.dataKey)}</span>
                          <span className="ml-auto font-medium tabular-nums">
                            {formatByUnit(unit, typeof entry.value === 'number' ? entry.value : 0)}
                          </span>
                        </Text>
                      ))}
                    </div>
                  ) : (
                    <Text as="div" size="xs" weight="medium" textColor="default">
                      {label}:{' '}
                      {formatByUnit(
                        unit,
                        typeof payload[0].value === 'number' ? payload[0].value : 0
                      )}
                    </Text>
                  )}
                </div>
              );
            }}
          />
          {isStackedChart && stack ? (
            <>
              <Legend
                verticalAlign="bottom"
                height={28}
                iconType="square"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              {stack.keys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key}
                  stackId="breakdown"
                  stroke={STACK_COLORS[index % STACK_COLORS.length]}
                  strokeWidth={1.5}
                  fill={STACK_COLORS[index % STACK_COLORS.length]}
                  fillOpacity={0.18}
                />
              ))}
            </>
          ) : (
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--primary)"
              strokeWidth={2}
              fill={`url(#${fillId})`}
              dot={
                showDots
                  ? {
                      r: 3,
                      fill: 'var(--primary)',
                      stroke: 'var(--background)',
                      strokeWidth: 1.5,
                    }
                  : false
              }
              activeDot={{
                r: 4,
                fill: 'var(--primary)',
                stroke: 'var(--background)',
                strokeWidth: 2,
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
