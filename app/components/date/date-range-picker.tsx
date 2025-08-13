'use client';

import { cn } from '@/modules/shadcn/lib/utils';
import { Button } from '@/modules/shadcn/ui/button';
import { Calendar } from '@/modules/shadcn/ui/calendar';
import { Input } from '@/modules/shadcn/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/modules/shadcn/ui/popover';
import { Trans } from '@lingui/react/macro';
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subHours,
  subMinutes,
} from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import * as React from 'react';
import { DateRange } from 'react-day-picker';

interface DateRangePreset {
  label: string;
  getValue: () => DateRange;
}

interface DateRangePickerProps {
  value?: DateRange;
  onValueChange?: (value: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  presets?: DateRangePreset[];
  defaultPresets?: boolean;
  showSelectedPresetLabel?: boolean;
}

export function DateRangePicker({
  value,
  onValueChange,
  placeholder = 'Pick a date range',
  className,
  disabled = false,
  presets,
  defaultPresets = false,
  showSelectedPresetLabel = false,
}: DateRangePickerProps) {
  const [startTime, setStartTime] = React.useState<string>('');
  const [endTime, setEndTime] = React.useState<string>('');
  const [open, setOpen] = React.useState<boolean>(false);
  const [selectedPresetLabel, setSelectedPresetLabel] = React.useState<string | undefined>();

  const DEFAULT_PRESETS: DateRangePreset[] = [
    {
      label: 'Last 5 minutes',
      getValue: () => ({ from: subMinutes(new Date(), 5), to: new Date() }),
    },
    {
      label: 'Last 15 minutes',
      getValue: () => ({ from: subMinutes(new Date(), 15), to: new Date() }),
    },
    {
      label: 'Last 30 minutes',
      getValue: () => ({ from: subMinutes(new Date(), 30), to: new Date() }),
    },
    { label: 'Last 1 hour', getValue: () => ({ from: subHours(new Date(), 1), to: new Date() }) },
    { label: 'Last 3 hours', getValue: () => ({ from: subHours(new Date(), 3), to: new Date() }) },
    { label: 'Last 6 hours', getValue: () => ({ from: subHours(new Date(), 6), to: new Date() }) },
    {
      label: 'Last 12 hours',
      getValue: () => ({ from: subHours(new Date(), 12), to: new Date() }),
    },
    {
      label: 'Last 24 hours',
      getValue: () => ({ from: subHours(new Date(), 24), to: new Date() }),
    },
    { label: 'Last 2 days', getValue: () => ({ from: subDays(new Date(), 2), to: new Date() }) },
    { label: 'Last 7 days', getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
    { label: 'Last 30 days', getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
    {
      label: 'Today',
      getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
    },
    { label: 'Today so far', getValue: () => ({ from: startOfDay(new Date()), to: new Date() }) },
    {
      label: 'This week',
      getValue: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }),
    },
    {
      label: 'This week so far',
      getValue: () => ({ from: startOfWeek(new Date()), to: new Date() }),
    },
    {
      label: 'This month',
      getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
    },
    {
      label: 'This month so far',
      getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }),
    },
    {
      label: 'This year',
      getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }),
    },
    {
      label: 'This year so far',
      getValue: () => ({ from: startOfYear(new Date()), to: new Date() }),
    },
  ];

  const resolvedPresets: DateRangePreset[] | undefined = React.useMemo(() => {
    if (presets && presets.length > 0) return presets;
    if (defaultPresets) return DEFAULT_PRESETS;
    return undefined;
  }, [presets, defaultPresets]);

  // Initialize time inputs when date range changes
  React.useEffect(() => {
    if (value?.from) {
      setStartTime(format(value.from, 'HH:mm'));
    }
    if (value?.to) {
      setEndTime(format(value.to, 'HH:mm'));
    }
    // If value changes externally, clear selected preset label (cannot infer which one was chosen)
    setSelectedPresetLabel(undefined);
  }, [value]);

  const handleDateSelect = (range: DateRange | undefined) => {
    if (!range) {
      onValueChange?.(undefined);
      setSelectedPresetLabel(undefined);
      return;
    }

    // Apply time to the selected dates
    let from = range.from;
    let to = range.to;

    if (from && startTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      from = new Date(from);
      from.setHours(hours, minutes, 0, 0);
    }

    if (to && endTime) {
      const [hours, minutes] = endTime.split(':').map(Number);
      to = new Date(to);
      to.setHours(hours, minutes, 0, 0);
    }

    // Only pass defined values
    if (from || to) {
      const result: Partial<DateRange> = {};
      if (from) result.from = from;
      if (to) result.to = to;
      onValueChange?.(result as DateRange);
      setSelectedPresetLabel(undefined);
    } else {
      onValueChange?.(undefined);
      setSelectedPresetLabel(undefined);
    }
  };

  const handleTimeChange = (type: 'start' | 'end', time: string) => {
    if (type === 'start') {
      setStartTime(time);
      if (value?.from && time) {
        const [hours, minutes] = time.split(':').map(Number);
        const newFrom = new Date(value.from);
        newFrom.setHours(hours, minutes, 0, 0);
        const result: Partial<DateRange> = { from: newFrom };
        if (value.to) result.to = value.to;
        onValueChange?.(result as DateRange);
        setSelectedPresetLabel(undefined);
      }
    } else {
      setEndTime(time);
      if (value?.to && time) {
        const [hours, minutes] = time.split(':').map(Number);
        const newTo = new Date(value.to);
        newTo.setHours(hours, minutes, 0, 0);
        const result: Partial<DateRange> = { to: newTo };
        if (value.from) result.from = value.from;
        onValueChange?.(result as DateRange);
        setSelectedPresetLabel(undefined);
      }
    }
  };

  const clearRange = () => {
    onValueChange?.(undefined);
    setStartTime('');
    setEndTime('');
    setSelectedPresetLabel(undefined);
  };

  const applyPreset = (preset: DateRangePreset) => {
    const next = preset.getValue();
    if (next?.from) setStartTime(format(next.from, 'HH:mm'));
    if (next?.to) setEndTime(format(next.to, 'HH:mm'));
    onValueChange?.(next);
    setSelectedPresetLabel(preset.label);
    setOpen(false);
  };

  const formatDisplayValue = () => {
    if (showSelectedPresetLabel && selectedPresetLabel) return selectedPresetLabel;
    if (!value?.from) return placeholder;

    const fromStr = format(value.from, 'MMM dd, yyyy HH:mm');
    const toStr = value.to ? format(value.to, 'MMM dd, yyyy HH:mm') : '';

    return toStr ? `${fromStr} - ${toStr}` : fromStr;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[350px] justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
            disabled={disabled}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDisplayValue()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3">
            <div className="flex items-start gap-4">
              <div className="min-w-[350px] flex-1">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={value?.from}
                  selected={value}
                  onSelect={handleDateSelect}
                  numberOfMonths={2}
                />
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-sm font-medium">
                      <Trans>Start Time</Trans>
                    </label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => handleTimeChange('start', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium">
                      <Trans>End Time</Trans>
                    </label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => handleTimeChange('end', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
              {resolvedPresets && resolvedPresets.length > 0 && (
                <div className="w-56 border-l pl-3">
                  <div className="mb-2 text-sm font-medium">
                    <Trans>Quick ranges</Trans>
                  </div>
                  <div className="flex max-h-96 flex-col gap-1 overflow-y-auto pr-1">
                    {resolvedPresets.map((preset) => (
                      <Button
                        key={preset.label}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => applyPreset(preset)}>
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={clearRange}
          disabled={disabled}
          className="h-9 w-9">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
