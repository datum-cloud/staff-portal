import { useFormContext } from './form-context';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/modules/shadcn/ui/form';
import { Button } from '@datum-cloud/datum-ui/button';
import { Calendar } from '@datum-cloud/datum-ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { cn } from '@datum-cloud/datum-ui/utils';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import * as React from 'react';
import { ComponentProps } from 'react';

interface FormDatePickerProps {
  field: string;
  label?: string;
  description?: string;
  required?: boolean;
  hideError?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showClearButton?: boolean;
  calendarProps?: ComponentProps<typeof Calendar>;
  rules?: {
    required?: boolean | string;
    validate?: (value: any) => boolean | string | Promise<boolean | string>;
  };
}

export function FormDatePicker({
  field,
  label,
  description,
  required,
  hideError = false,
  placeholder = 'Pick a date',
  disabled = false,
  className,
  showClearButton = true,
  calendarProps,
  rules,
}: FormDatePickerProps) {
  const { form } = useFormContext();
  const [open, setOpen] = React.useState(false);

  return (
    <FormField
      control={form.control}
      name={field}
      rules={{
        ...rules,
        ...(required && { required: required === true ? 'This field is required' : required }),
      }}
      render={({ field: fieldProps, fieldState: { error } }) => {
        const date = fieldProps.value
          ? fieldProps.value instanceof Date
            ? fieldProps.value
            : new Date(fieldProps.value)
          : undefined;

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
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    theme="outline"
                    className={cn(
                      'relative w-full justify-start pr-8 text-left font-normal',
                      !date && 'text-muted-foreground',
                      error && 'border-destructive'
                    )}
                    disabled={disabled}
                    htmlType="button">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>{placeholder}</span>}
                    {showClearButton && date && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fieldProps.onChange(undefined);
                        }}
                        disabled={disabled}
                        className="ring-offset-background focus:ring-ring absolute top-1/2 right-2 -translate-y-1/2 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(selectedDate) => {
                    fieldProps.onChange(selectedDate);
                    setOpen(false);
                  }}
                  initialFocus
                  {...(calendarProps as any)}
                />
              </PopoverContent>
            </Popover>
            {!hideError && <FormMessage />}
          </FormItem>
        );
      }}
    />
  );
}
