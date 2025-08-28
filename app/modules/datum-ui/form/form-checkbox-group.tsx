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
import { ComponentProps, createContext, useContext, ReactNode } from 'react';

interface CheckboxGroupContextValue {
  name: string;
  value: string[];
  onChange: (value: string, checked: boolean) => void;
  hasError: boolean;
}

const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(null);

export function useCheckboxGroupContext() {
  const context = useContext(CheckboxGroupContext);
  if (!context) {
    throw new Error('useCheckboxGroupContext must be used within a FormCheckboxGroup');
  }
  return context;
}

interface FormCheckboxGroupProps {
  field: string;
  label?: string;
  description?: string;
  required?: boolean;
  hideError?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormCheckboxGroup({
  field,
  label,
  description,
  required,
  hideError = false,
  children,
  className,
}: FormCheckboxGroupProps) {
  const { form } = useFormContext();

  return (
    <FormField
      control={form.control}
      name={field}
      render={({ field: fieldProps, fieldState: { error } }) => {
        const values = fieldProps.value || [];
        const hasError = !!error;

        const handleChange = (value: string, checked: boolean) => {
          const newValues = checked
            ? [...values, value]
            : values.filter((v: string) => v !== value);
          fieldProps.onChange(newValues);
        };

        const contextValue: CheckboxGroupContextValue = {
          name: field,
          value: values,
          onChange: handleChange,
          hasError,
        };

        return (
          <CheckboxGroupContext.Provider value={contextValue}>
            <FormItem className={className}>
              <div className="space-y-2">
                <div className="space-y-1">
                  {label && (
                    <FormLabel
                      className={
                        required ? 'after:text-destructive after:ml-0.5 after:content-["*"]' : ''
                      }>
                      {label}
                    </FormLabel>
                  )}
                  {description && <FormDescription>{description}</FormDescription>}
                </div>
                <div className="space-y-1">{children}</div>
                {!hideError && <FormMessage />}
              </div>
            </FormItem>
          </CheckboxGroupContext.Provider>
        );
      }}
    />
  );
}

interface FormCheckboxItemProps extends Omit<ComponentProps<typeof Checkbox>, 'name'> {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function FormCheckboxItem({ value, children, disabled, className }: FormCheckboxItemProps) {
  const { value: groupValue, onChange, hasError } = useCheckboxGroupContext();
  const isChecked = groupValue.includes(value);
  const id = `checkbox-${value}`;

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={isChecked}
        onCheckedChange={(checked) => onChange(value, !!checked)}
        disabled={disabled}
        className={className}
      />
      <FormLabel htmlFor={id} className="cursor-pointer">
        {children}
      </FormLabel>
    </div>
  );
}
