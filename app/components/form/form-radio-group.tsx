import { useFormContext } from './form-context';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/modules/shadcn/ui/form';
import { RadioGroup, RadioGroupItem } from '@/modules/shadcn/ui/radio-group';
import { ComponentProps, createContext, useContext, ReactNode } from 'react';

interface RadioGroupContextValue {
  name: string;
  value: string;
  onChange: (value: string) => void;
  hasError: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export function useRadioGroupContext() {
  const context = useContext(RadioGroupContext);
  if (!context) {
    throw new Error('useRadioGroupContext must be used within a FormRadioGroup');
  }
  return context;
}

interface FormRadioGroupProps {
  field: string;
  label?: string;
  description?: string;
  required?: boolean;
  hideError?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormRadioGroup({
  field,
  label,
  description,
  required,
  hideError = false,
  children,
  className,
}: FormRadioGroupProps) {
  const { form } = useFormContext();

  return (
    <FormField
      control={form.control}
      name={field}
      render={({ field: fieldProps, fieldState: { error } }) => {
        const value = fieldProps.value || '';
        const hasError = !!error;

        const handleChange = (newValue: string) => {
          fieldProps.onChange(newValue);
        };

        const contextValue: RadioGroupContextValue = {
          name: field,
          value,
          onChange: handleChange,
          hasError,
        };

        return (
          <RadioGroupContext.Provider value={contextValue}>
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
                <FormControl>
                  <RadioGroup value={value} onValueChange={handleChange} className="grid gap-1">
                    {children}
                  </RadioGroup>
                </FormControl>
                {!hideError && <FormMessage />}
              </div>
            </FormItem>
          </RadioGroupContext.Provider>
        );
      }}
    />
  );
}

interface FormRadioProps extends Omit<ComponentProps<typeof RadioGroupItem>, 'name'> {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function FormRadio({ value, children, disabled, className }: FormRadioProps) {
  const { value: groupValue, onChange } = useRadioGroupContext();
  const isChecked = groupValue === value;
  const id = `radio-${value}`;

  return (
    <div className="flex items-center space-x-2">
      <RadioGroupItem id={id} value={value} disabled={disabled} className={className} />
      <FormLabel htmlFor={id} className="cursor-pointer">
        {children}
      </FormLabel>
    </div>
  );
}
