'use client';

import { cn } from '@/modules/shadcn/lib/utils';
import { Button } from '@/modules/shadcn/ui/button';
import { Calendar } from '@/modules/shadcn/ui/calendar';
import { Input } from '@/modules/shadcn/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/modules/shadcn/ui/popover';
import { format, isValid, parseISO } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import * as React from 'react';
import { DateRange } from 'react-day-picker';

interface DateRangePickerProps {
  value?: DateRange;
  onValueChange?: (value: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  value,
  onValueChange,
  placeholder = 'Pick a date range',
  className,
  disabled = false,
}: DateRangePickerProps) {
  const [startTime, setStartTime] = React.useState<string>('');
  const [endTime, setEndTime] = React.useState<string>('');

  // Initialize time inputs when date range changes
  React.useEffect(() => {
    if (value?.from) {
      setStartTime(format(value.from, 'HH:mm'));
    }
    if (value?.to) {
      setEndTime(format(value.to, 'HH:mm'));
    }
  }, [value]);

  const handleDateSelect = (range: DateRange | undefined) => {
    if (!range) {
      onValueChange?.(undefined);
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
    } else {
      onValueChange?.(undefined);
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
      }
    }
  };

  const clearRange = () => {
    onValueChange?.(undefined);
    setStartTime('');
    setEndTime('');
  };

  const formatDisplayValue = () => {
    if (!value?.from) return placeholder;

    const fromStr = format(value.from, 'MMM dd, yyyy HH:mm');
    const toStr = value.to ? format(value.to, 'MMM dd, yyyy HH:mm') : '';

    return toStr ? `${fromStr} - ${toStr}` : fromStr;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover>
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
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleTimeChange('start', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">End Time</label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => handleTimeChange('end', e.target.value)}
                  className="mt-1"
                />
              </div>
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
