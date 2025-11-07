import { useFormContext } from './form-context';
import { cn } from '@/modules/shadcn/lib/utils';
import { Button } from '@/modules/shadcn/ui/button';
import { Calendar } from '@/modules/shadcn/ui/calendar';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/modules/shadcn/ui/form';
import { Input } from '@/modules/shadcn/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/modules/shadcn/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import * as React from 'react';
import { ComponentProps } from 'react';

interface FormDateTimePickerProps {
  field: string;
  label?: string;
  description?: string;
  required?: boolean;
  hideError?: boolean;
  placeholder?: string;
  timePlaceholder?: string;
  disabled?: boolean;
  className?: string;
  showClearButton?: boolean;
  calendarProps?: ComponentProps<typeof Calendar>;
  dateFormat?: string;
  modal?: boolean;
  rules?: {
    required?: boolean | string;
    validate?: (value: any) => boolean | string | Promise<boolean | string>;
  };
}

export function FormDateTimePicker({
  field,
  label,
  description,
  required,
  hideError = false,
  placeholder = 'Pick a date and time',
  timePlaceholder = 'HH:mm',
  disabled = false,
  className,
  showClearButton = true,
  calendarProps,
  dateFormat = 'PPP',
  modal = false,
  rules,
}: FormDateTimePickerProps) {
  const { form } = useFormContext();
  const [open, setOpen] = React.useState(false);
  const [timeValue, setTimeValue] = React.useState<string>('');

  // Watch the field value to sync timeValue
  const fieldValue = form.watch(field);

  React.useEffect(() => {
    if (fieldValue) {
      const dateTime = fieldValue instanceof Date ? fieldValue : new Date(fieldValue);
      if (!isNaN(dateTime.getTime())) {
        setTimeValue(format(dateTime, 'HH:mm'));
      } else {
        setTimeValue('');
      }
    } else {
      setTimeValue('');
    }
  }, [fieldValue]);

  return (
    <FormField
      control={form.control}
      name={field}
      rules={{
        ...rules,
        ...(required && { required: required === true ? 'This field is required' : required }),
      }}
      render={({ field: fieldProps, fieldState: { error } }) => {
        const dateTime = fieldProps.value
          ? fieldProps.value instanceof Date
            ? fieldProps.value
            : new Date(fieldProps.value)
          : undefined;

        const handleDateSelect = (selectedDate: Date | undefined) => {
          if (!selectedDate) {
            fieldProps.onChange(undefined);
            setTimeValue('');
            return;
          }

          // If time is already set, apply it to the new date
          if (timeValue) {
            const [hours, minutes] = timeValue.split(':').map(Number);
            const newDateTime = new Date(selectedDate);
            newDateTime.setHours(hours, minutes, 0, 0);
            fieldProps.onChange(newDateTime);
          } else {
            // If no time set, use the selected date with current time
            const newDateTime = new Date(selectedDate);
            const now = new Date();
            newDateTime.setHours(now.getHours(), now.getMinutes(), 0, 0);
            fieldProps.onChange(newDateTime);
            setTimeValue(format(newDateTime, 'HH:mm'));
          }
        };

        const handleTimeChange = (time: string) => {
          setTimeValue(time);
          if (dateTime && time) {
            const [hours, minutes] = time.split(':').map(Number);
            const newDateTime = new Date(dateTime);
            newDateTime.setHours(hours, minutes, 0, 0);
            fieldProps.onChange(newDateTime);
          } else if (!dateTime && time) {
            // If date is not set but time is, create a new date with today's date and selected time
            const today = new Date();
            const [hours, minutes] = time.split(':').map(Number);
            today.setHours(hours, minutes, 0, 0);
            fieldProps.onChange(today);
          }
        };

        const formatDisplayValue = () => {
          if (!dateTime) return placeholder;
          return format(dateTime, `${dateFormat} HH:mm`);
        };

        return (
          <FormItem className={cn('flex flex-col', className)}>
            {label && (
              <FormLabel
                className={
                  required ? 'after:text-destructive after:ml-0.5 after:content-["*"]' : ''
                }>
                {label}
              </FormLabel>
            )}
            {description && <FormDescription>{description}</FormDescription>}
            <Popover open={open} onOpenChange={setOpen} modal={modal}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      'relative w-full justify-start pr-8 text-left font-normal',
                      !dateTime && 'text-muted-foreground',
                      error && 'border-destructive'
                    )}
                    disabled={disabled}
                    type="button">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDisplayValue()}
                    {showClearButton && dateTime && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fieldProps.onChange(undefined);
                          setTimeValue('');
                        }}
                        disabled={disabled}
                        className="ring-offset-background focus:ring-ring absolute right-2 top-1/2 -translate-y-1/2 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3">
                  <Calendar
                    mode="single"
                    selected={dateTime}
                    onSelect={(selectedDate) => handleDateSelect(selectedDate as Date | undefined)}
                    initialFocus
                    {...(calendarProps as any)}
                  />
                  <div className="mt-3">
                    <label className="mb-1 block text-sm font-medium">Time</label>
                    <Input
                      type="time"
                      value={timeValue}
                      onChange={(e) => handleTimeChange(e.target.value)}
                      placeholder={timePlaceholder}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {!hideError && <FormMessage />}
          </FormItem>
        );
      }}
    />
  );
}
