import { createContext, useContext, ReactNode } from 'react';
import { UseFormReturn } from 'react-hook-form';

interface FormContextValue {
  form: UseFormReturn<any>;
}

const FormContext = createContext<FormContextValue | null>(null);

export function FormProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: FormContextValue;
}) {
  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
}

export function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
}
