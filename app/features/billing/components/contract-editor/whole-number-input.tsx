import { Form } from '@datum-cloud/datum-ui/form';
import { Input } from '@datum-cloud/datum-ui/input';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { ComponentProps } from 'react';

/** Keeps only the digits of what was typed or pasted. */
export const digitsOnly = (value: string) => value.replace(/\D/g, '');

/**
 * A Form.Input for a whole number, such as a quantity or a percentage: it
 * drops anything that isn't a digit as it's typed or pasted. The value stays
 * a string, as the form's schema expects.
 */
export function WholeNumberInput({
  className,
  disabled,
  ...props
}: Omit<ComponentProps<'input'>, 'ref' | 'name' | 'value' | 'onChange' | 'type'>) {
  const { id, errors, disabled: fieldDisabled, fieldState } = Form.useFieldContext();
  const hasErrors = Boolean(errors && errors.length > 0);
  return (
    <Input
      {...props}
      id={id}
      name={fieldState?.name}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={(fieldState?.value as string | undefined) ?? ''}
      onChange={(e) => fieldState?.change(digitsOnly(e.target.value))}
      onBlur={() => fieldState?.blur()}
      className={cn('!text-xs', className)}
      disabled={disabled ?? fieldDisabled}
      aria-invalid={hasErrors || undefined}
      aria-describedby={hasErrors ? `${id}-error` : undefined}
    />
  );
}
