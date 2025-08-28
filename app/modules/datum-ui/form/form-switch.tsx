import { useFormContext } from './form-context';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/modules/shadcn/ui/form';
import { Switch } from '@/modules/shadcn/ui/switch';
import { ComponentProps } from 'react';

interface FormSwitchProps extends Omit<ComponentProps<typeof Switch>, 'name'> {
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

export function FormSwitch({
  field,
  label,
  description,
  required,
  hideError = false,
  rules,
  ...props
}: FormSwitchProps) {
  const { form } = useFormContext();
  const id = `switch-${field}`;

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
              <Switch
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
