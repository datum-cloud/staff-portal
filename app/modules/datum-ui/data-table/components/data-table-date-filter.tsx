import { DateRangePicker } from '@/components/date';
import { useApp } from '@/providers/app.provider';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { getUnixTime } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export interface DatePreset {
  label: string;
  getValue: () => { from: Date; to: Date };
}

export interface DataTableDateFilterProps {
  label: string;
  placeholder?: string;
  presets?: DatePreset[];
  value?: { from?: Date; to?: Date };
  onValueChange: (value: { from?: Date; to?: Date } | undefined) => void;
  className?: string;
}

export function DataTableDateFilter({
  label,
  placeholder,
  presets,
  value,
  onValueChange,
  className,
}: DataTableDateFilterProps) {
  const { settings } = useApp();

  // Helper functions for timezone conversion
  const convertFromApiTimestamp = (timestamp: string) => {
    const utcDate = new Date(parseInt(timestamp) / 1000000);
    const timeZone = settings?.timezone;
    return timeZone && timeZone !== 'Etc/GMT' ? fromZonedTime(utcDate, timeZone) : utcDate;
  };

  const convertToApiTimestamp = (date: Date) => {
    const timeZone = settings?.timezone;
    const utcDate = timeZone && timeZone !== 'Etc/GMT' ? toZonedTime(date, timeZone) : date;
    return getUnixTime(utcDate) * 1000000;
  };

  return (
    <DateRangePicker
      presets={presets}
      placeholder={placeholder || t`Filter by time range`}
      value={value}
      onValueChange={onValueChange}
      className={className}
    />
  );
}
