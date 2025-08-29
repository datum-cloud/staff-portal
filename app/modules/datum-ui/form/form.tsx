import { FormProvider } from './form-context';
import { Form as ShadcnForm } from '@/modules/shadcn/ui/form';
import React, { ReactNode } from 'react';
import { useForm, UseFormReturn, Resolver } from 'react-hook-form';
import { z, ZodSchema } from 'zod';

// Custom zodResolver that works with Bun and our ZodSchema type
function createZodResolver(schema: any): Resolver<any> {
  return async (data) => {
    try {
      const validatedData = await schema.parseAsync(data);
      return {
        values: validatedData,
        errors: {},
      };
    } catch (error: any) {
      if (error && error.issues) {
        const errors: Record<string, any> = {};
        error.issues.forEach((err: any) => {
          const path = err.path.join('.');
          errors[path] = {
            type: 'validation',
            message: err.message,
          };
        });
        return {
          values: {},
          errors,
        };
      }
      return {
        values: {},
        errors: {},
      };
    }
  };
}

// Type for form data when using schema
type SchemaFormData<TSchema extends ZodSchema> = z.infer<TSchema>;

// Type for form data when using rules (generic object)
type RulesFormData = Record<string, any>;

// Union type for form data
type FormData = SchemaFormData<any> | RulesFormData;

// Base form props that are common to both modes
type BaseFormProps = {
  // Styling
  className?: string; // CSS classes for the form element

  // Validation Mode Options
  mode?: 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched' | 'all'; // When validation occurs
  reValidateMode?: 'onChange' | 'onBlur' | 'onSubmit'; // When re-validation occurs after submit

  // Error Handling Options
  shouldFocusError?: boolean; // Automatically focus the first field with an error
  shouldUseNativeValidation?: boolean; // Use browser's built-in HTML5 validation
  shouldUnregister?: boolean; // Remove fields from form state when component unmounts
  criteriaMode?: 'firstError' | 'all'; // How many validation errors to show per field
  delayError?: number; // Delay showing error messages (in milliseconds)

  // Children
  children?: ((form: UseFormReturn<any>) => ReactNode) | ReactNode; // Render prop that receives the form instance or direct children
};

// Form props when using schema
type SchemaFormProps<TSchema extends ZodSchema> = BaseFormProps & {
  schema: TSchema; // The Zod schema that defines form structure and validation rules
  defaultValues: SchemaFormData<TSchema>; // Initial values for form fields (automatically typed from schema)
  onSubmit: (values: SchemaFormData<TSchema>) => void | Promise<void>; // Function called when form is submitted (receives validated data)
};

// Form props when using rules (no schema)
type RulesFormProps = BaseFormProps & {
  schema?: never; // No schema allowed
  defaultValues: RulesFormData; // Initial values for form fields
  onSubmit: (values: RulesFormData) => void | Promise<void>; // Function called when form is submitted
};

// Union type for all form props
type FormProps<TSchema extends ZodSchema = never> = SchemaFormProps<TSchema> | RulesFormProps;

export function Form<TSchema extends ZodSchema = never>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
  mode = 'onSubmit',
  reValidateMode = 'onChange',
  shouldFocusError = true,
  shouldUseNativeValidation = false,
  shouldUnregister = false,
  criteriaMode = 'firstError',
  delayError,
  ...rest
}: FormProps<TSchema>) {
  // Determine if we're using schema or rules-based validation
  const isSchemaMode = schema !== undefined;

  const form = useForm<any>({
    // Use Zod resolver if schema is provided, otherwise use React Hook Form's native validation
    resolver: isSchemaMode ? createZodResolver(schema!) : undefined,
    defaultValues,
    mode,
    reValidateMode,
    shouldFocusError,
    shouldUseNativeValidation,
    shouldUnregister,
    criteriaMode,
    delayError,
  });

  return (
    <FormProvider value={{ form: form as any }}>
      <ShadcnForm {...(form as any)}>
        <form
          onSubmit={(form as any).handleSubmit(onSubmit)}
          className={className}
          noValidate={!shouldUseNativeValidation}>
          {typeof children === 'function' ? children(form) : children}
        </form>
      </ShadcnForm>
    </FormProvider>
  );
}
