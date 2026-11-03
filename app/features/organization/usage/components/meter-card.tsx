import { formatUsagePair } from '../usage.format';
import type { MeterPoint, UsageMeter } from '../usage.types';
import { humanizeDimension } from '../usage.view';
import { MeterAreaChart, type MeterStack } from './meter-area-chart';
import { SpendValue } from './spend-value';
import { QuotaIndicator } from '@/features/organization/components/quota-ring';
import { Card, CardContent, CardHeader } from '@datum-cloud/datum-ui/card';
import { Tabs, TabsList, TabsTrigger } from '@datum-cloud/datum-ui/tabs';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useState } from 'react';

interface MeterCardProps {
  meter: UsageMeter;
}

const MAX_STACK_SERIES = 6;

type StackRow = Record<string, number>;

function buildStackData(
  series: { groupValue: string; total: number; values: MeterPoint[] }[]
): MeterStack {
  const top = [...series].sort((a, b) => b.total - a.total).slice(0, MAX_STACK_SERIES);
  const keys = top.map((s) => s.groupValue);

  const byTimestamp = new Map<number, StackRow>();
  for (const s of top) {
    for (const point of s.values) {
      const row = byTimestamp.get(point.timestamp) ?? { timestamp: point.timestamp };
      row[s.groupValue] = (row[s.groupValue] ?? 0) + point.value;
      byTimestamp.set(point.timestamp, row);
    }
  }
  const data = Array.from(byTimestamp.values()).sort((a, b) => a.timestamp - b.timestamp);
  return { keys, data };
}

/**
 * Per-meter card: title + description, used/limit with quota ring,
 * optional breakdown tabs, and a filled area chart.
 */
export function MeterCard({ meter }: MeterCardProps) {
  const [activeTab, setActiveTab] = useState(meter.tabs[0]);

  const isBreakdownView = activeTab !== 'Total';
  const activeBreakdown = isBreakdownView
    ? (meter.breakdowns ?? []).find((b) => humanizeDimension(b.dimension) === activeTab)
    : undefined;
  const stack =
    activeBreakdown && activeBreakdown.series.length > 0
      ? buildStackData(activeBreakdown.series)
      : null;
  const isStackedChart = Boolean(stack && stack.keys.length > 0);
  const chartData = isStackedChart ? stack!.data : meter.series;
  const hasBreakdownTabs = (meter.breakdowns?.length ?? 0) > 0;

  return (
    <Card className="min-w-0 gap-0 overflow-hidden rounded-xl py-0 shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 px-4 pt-6 pb-0 sm:px-8 sm:pt-8">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Title as="h3" level={6} weight="medium" textColor="default" className="sm:text-lg">
            {meter.label}
          </Title>
          {meter.description ? (
            <Text as="p" textColor="muted" className="leading-relaxed">
              {meter.description}
            </Text>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 sm:gap-1.5">
          <Text weight="medium" textColor="default" className="text-right tabular-nums">
            {formatUsagePair(meter.unit, meter.used, meter.limit)}
            {meter.qualifier ? (
              <Text as="span" size="xs" textColor="muted" weight="normal" className="ml-1">
                {meter.qualifier}
              </Text>
            ) : null}
          </Text>
          <div className="flex items-center gap-2 sm:gap-3">
            {meter.spend || meter.spendError ? (
              <Text size="xs" textColor="muted" className="text-right">
                <SpendValue
                  spend={meter.spend}
                  spendError={meter.spendError}
                  className="text-foreground font-medium"
                />{' '}
                spent
              </Text>
            ) : null}
            <QuotaIndicator used={meter.used} limit={meter.limit} size={24} />
          </div>
        </div>
      </CardHeader>

      {hasBreakdownTabs ? (
        <div className="px-4 pt-4 sm:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 bg-transparent">
            <TabsList className="scrollbar-hide h-auto max-w-full justify-start gap-4 overflow-x-auto rounded-none bg-transparent p-0">
              {meter.tabs.map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className={cn(
                    'relative shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2 text-xs font-normal shadow-none',
                    'focus-visible:ring-0 focus-visible:outline-hidden',
                    'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:shadow-none'
                  )}>
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      ) : null}

      <CardContent className="min-w-0 px-4 pt-4 pb-6 sm:px-8 sm:pb-8">
        {isBreakdownView && !isStackedChart ? (
          <Text as="div" textColor="muted" className="flex h-[220px] items-center justify-center">
            No {activeTab.toLowerCase()} breakdown recorded in this period.
          </Text>
        ) : chartData.length === 0 ? (
          <Text as="div" textColor="muted" className="flex h-[220px] items-center justify-center">
            No usage recorded in this period.
          </Text>
        ) : (
          <MeterAreaChart
            // Remount per tab so the chart animates in afresh.
            key={activeTab}
            id={meter.id}
            label={meter.label}
            unit={meter.unit}
            series={meter.series}
            stack={isStackedChart ? stack : null}
          />
        )}
      </CardContent>
    </Card>
  );
}
