import { useFormContext } from './form-context';
import { Checkbox } from '@/modules/shadcn/ui/checkbox';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/modules/shadcn/ui/form';
import { ComponentProps } from 'react';

interface FormCheckboxProps extends Omit<ComponentProps<typeof Checkbox>, 'name'> {
  field: string;
  label?: string;
  description?: string;
  required?: boolean;
  hideError?: boolean;
  rules?: {
    required?: boolean | string;
    validate?: (value: any) => boolean | string | Promise<boolean | string>;
  };
}

export function FormCheckbox({
  field,
  label,
  description,
  required,
  hideError = false,
  rules,
  ...props
}: FormCheckboxProps) {
  const { form } = useFormContext();
  const id = `checkbox-${field}`;

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
          <div className="flex items-center space-x-2">
            <FormControl>
              <Checkbox
                id={id}
                checked={fieldProps.value}
                onCheckedChange={fieldProps.onChange}
                {...props}
              />
            </FormControl>
            {label && (
              <FormLabel
                htmlFor={id}
                className={`cursor-pointer ${required ? 'after:text-destructive after:ml-0.5 after:content-["*"]' : ''}`}>
                {label}
              </FormLabel>
            )}
          </div>
          {description && <FormDescription>{description}</FormDescription>}
          {!hideError && <FormMessage />}
        </FormItem>
      )}
    />
  );
}
