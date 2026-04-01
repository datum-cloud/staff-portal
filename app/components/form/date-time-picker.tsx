import { Button } from '@datum-cloud/datum-ui/button';
import { Calendar } from '@datum-cloud/datum-ui/calendar';
import { Form } from '@datum-cloud/datum-ui/form';
import { Input } from '@datum-cloud/datum-ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { cn } from '@datum-cloud/datum-ui/utils';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import * as React from 'react';

type FormDateTimePickerProps = {
  name: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  timePlaceholder?: string;
  dateFormat?: string;
  showClearButton?: boolean;
  modal?: boolean;
  className?: string;
};

export function FormDateTimePicker({
  name,
  label,
  description,
  required = false,
  disabled = false,
  placeholder = 'Pick a date and time',
  timePlaceholder = 'HH:mm',
  dateFormat = 'PPP',
  showClearButton = true,
  modal = false,
  className,
}: FormDateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Form.Field
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}>
      {({ control, meta }) => {
        const raw = control.value;
        const current =
          raw instanceof Date ? raw : typeof raw === 'string' && raw ? new Date(raw) : undefined;
        const dateTime = current && !Number.isNaN(current.getTime()) ? current : undefined;
        const currentTime = dateTime ? format(dateTime, 'HH:mm') : '';

        const setDate = (selectedDate: Date | undefined) => {
          if (!selectedDate) {
            control.change(undefined);
            return;
          }
          if (currentTime) {
            const [h, m] = currentTime.split(':').map(Number);
            const next = new Date(selectedDate);
            next.setHours(h, m, 0, 0);
            control.change(next);
            return;
          }
          const now = new Date();
          const next = new Date(selectedDate);
          next.setHours(now.getHours(), now.getMinutes(), 0, 0);
          control.change(next);
        };

        const setTime = (time: string) => {
          if (!time) return;
          const [h, m] = time.split(':').map(Number);
          const next = dateTime ? new Date(dateTime) : new Date();
          next.setHours(h, m, 0, 0);
          control.change(next);
        };

        return (
          <Popover open={open} onOpenChange={setOpen} modal={modal}>
            <PopoverTrigger asChild>
              <Button
                theme="outline"
                className={cn(
                  'relative w-full justify-start pr-8 text-left font-normal',
                  !dateTime && 'text-muted-foreground',
                  meta.errors.length > 0 && 'border-destructive'
                )}
                htmlType="button"
                disabled={disabled}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTime ? format(dateTime, `${dateFormat} HH:mm`) : placeholder}
                {showClearButton && dateTime && (
                  <button
                    type="button"
                    className="absolute top-1/2 right-2 -translate-y-1/2 opacity-70 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      control.change(undefined);
                    }}>
                    <X className="h-4 w-4" />
                  </button>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3">
                <Calendar
                  mode="single"
                  selected={dateTime}
                  onSelect={(selectedDate) => setDate(selectedDate as Date | undefined)}
                  initialFocus
                />
                <div className="mt-3">
                  <div className="mb-1 text-sm font-medium">Time</div>
                  <Input
                    type="time"
                    value={currentTime}
                    placeholder={timePlaceholder}
                    className="h-9 w-full"
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );
      }}
    </Form.Field>
  );
}
