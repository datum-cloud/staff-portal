import { useFormContext } from './form-context';
import { cn } from '@datum-cloud/datum-ui/utils';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/modules/shadcn/ui/form';
import { Input } from '@/modules/shadcn/ui/input';
import { ComponentProps } from 'react';

interface FormTimePickerProps extends Omit<ComponentProps<typeof Input>, 'name' | 'type'> {
  field: string;
  label?: string;
  description?: string;
  required?: boolean;
  hideError?: boolean;
  placeholder?: string;
  className?: string;
  rules?: {
    required?: boolean | string;
    validate?: (value: any) => boolean | string | Promise<boolean | string>;
  };
}

export function FormTimePicker({
  field,
  label,
  description,
  required,
  hideError = false,
  placeholder,
  className,
  rules,
  ...props
}: FormTimePickerProps) {
  const { form } = useFormContext();

  return (
    <FormField
      control={form.control}
      name={field}
      rules={{
        ...rules,
        ...(required && { required: required === true ? 'This field is required' : required }),
      }}
      render={({ field: fieldProps, fieldState: { error } }) => (
        <FormItem className={cn('flex flex-col', className)}>
          {label && (
            <FormLabel
              className={required ? 'after:text-destructive after:ml-0.5 after:content-["*"]' : ''}>
              {label}
            </FormLabel>
          )}
          {description && <FormDescription>{description}</FormDescription>}
          <FormControl>
            <Input
              type="time"
              placeholder={placeholder}
              className={cn(error && 'border-destructive')}
              {...fieldProps}
              {...props}
            />
          </FormControl>
          {!hideError && <FormMessage />}
        </FormItem>
      )}
    />
  );
}
