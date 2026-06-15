import { BaseMetric } from './base-metric';
import { useMetricCard } from '@/modules/metrics/hooks';
import { formatValue } from '@/modules/prometheus/formatter';
import type { MetricFormat } from '@/modules/prometheus/types';
import { cn } from '@datum-cloud/datum-ui/utils';
import React, { useMemo } from 'react';

export interface MetricCardProps {
  query: string;
  title?: string;
  description?: string;
  metricFormat?: MetricFormat;
  suffix?: string;
  precision?: number;
  className?: string;
  icon?: React.ComponentType<{ className?: string }> | React.ReactElement;
  refetchInterval?: number | false;
  enabled?: boolean;
}

export function MetricCard({
  query,
  title,
  description,
  metricFormat = 'number',
  suffix,
  precision = 2,
  className,
  icon,
  refetchInterval = 60000,
  enabled = true,
}: MetricCardProps) {
  const { data, isLoading, isFetching, error } = useMetricCard({
    query,
    metricFormat,
    enabled,
    refetchInterval,
  });

  const formattedValue = useMemo(() => {
    if (!data) return '—';
    let formatted = formatValue(data.value, metricFormat, precision);
    if (suffix) formatted += ` ${suffix}`;
    return formatted;
  }, [data, metricFormat, precision, suffix]);

  const IconComponent = icon
    ? React.isValidElement(icon)
      ? icon
      : React.createElement(icon as React.ComponentType<{ className?: string }>, {
          className: 'text-muted-foreground h-4 w-4',
        })
    : null;

  return (
    <BaseMetric
      title={title}
      description={description}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error ?? null}
      className={cn('MetricCard', className)}
      isEmpty={!data}>
      <div className="flex flex-col gap-1 px-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">{formattedValue}</div>
          {IconComponent}
        </div>
        {data?.timestamp && (
          <div className="text-muted-foreground text-xs">
            Updated {new Date(data.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </BaseMetric>
  );
}
