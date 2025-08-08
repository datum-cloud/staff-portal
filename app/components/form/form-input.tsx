import { useFormContext } from './form-context';
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

interface FormInputProps extends Omit<ComponentProps<typeof Input>, 'name'> {
  field: string;
  label?: string;
  description?: string;
  required?: boolean;
  hideError?: boolean;
  rules?: {
    required?: boolean | string;
    min?: number | { value: number; message: string };
    max?: number | { value: number; message: string };
    minLength?: number | { value: number; message: string };
    maxLength?: number | { value: number; message: string };
    pattern?: RegExp | { value: RegExp; message: string };
    validate?: (value: any) => boolean | string | Promise<boolean | string>;
  };
}

export function FormInput({
  field,
  label,
  description,
  required,
  hideError = false,
  rules,
  ...props
}: FormInputProps) {
  const { form } = useFormContext();

  return (
    <FormField
      control={form.control}
      name={field}
      rules={{
        ...rules,
        ...(required && { required: required === true ? 'This field is required' : required }),
      }}
      render={({ field: fieldProps }) => (
        <FormItem>
          {label && (
            <FormLabel
              className={required ? 'after:text-destructive after:ml-0.5 after:content-["*"]' : ''}>
              {label}
            </FormLabel>
          )}
          {description && <FormDescription>{description}</FormDescription>}
          <FormControl>
            <Input {...fieldProps} {...props} />
          </FormControl>
          {!hideError && <FormMessage />}
        </FormItem>
      )}
    />
  );
}
