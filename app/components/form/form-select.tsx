import { useFormContext } from './form-context';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/modules/shadcn/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/modules/shadcn/ui/select';
import { ComponentProps } from 'react';

interface SelectOption {
  label: string;
  value: string;
}

interface FormSelectProps extends Omit<ComponentProps<typeof Select>, 'name'> {
  field: string;
  label?: string;
  description?: string;
  required?: boolean;
  hideError?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

export function FormSelect({
  field,
  label,
  description,
  required,
  hideError = false,
  options,
  placeholder = 'Select an option',
  ...props
}: FormSelectProps) {
  const { form } = useFormContext();

  return (
    <FormField
      control={form.control}
      name={field}
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
            <Select onValueChange={fieldProps.onChange} value={fieldProps.value} {...props}>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          {!hideError && <FormMessage />}
        </FormItem>
      )}
    />
  );
}
