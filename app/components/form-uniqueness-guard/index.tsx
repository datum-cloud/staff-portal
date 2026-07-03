import { STATUS_ICONS } from '@/utils/config/icons.config';
import { Alert, AlertDescription } from '@datum-cloud/datum-ui/alert';
import { Form } from '@datum-cloud/datum-ui/form';
import { useEffect, type ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';

const ERROR_TYPE = 'uniqueness';

export interface UseExistsResult<T> {
  isChecking: boolean;
  existing: T | undefined;
}

export interface FormUniquenessGuardProps<T, A extends unknown[]> {
  /** Name of the form field to watch and guard. */
  field: string;
  /**
   * Hook that resolves whether a record with `value` already exists.
   * Must follow the rules of hooks — pass the hook reference directly
   * (do not wrap it in an inline arrow).
   */
  useExists: (value: string, ...args: A) => UseExistsResult<T>;
  /** Extra args passed to `useExists` after the value (e.g. ignore-self id). */
  existsArgs?: A;
  /**
   * Message shown as the field-level error when a duplicate is found.
   * The Form.Field renders it under the input with destructive styling
   * (red border, red text) and the form's `isValid` flips to `false`.
   */
  message: string;
  /**
   * Optional extra content rendered below the field when a duplicate is
   * found — e.g. a link to view the existing record. The standard field
   * error already shows the message.
   */
  renderHint?: (existing: T) => ReactNode;
  /**
   * Reports the duplicate state up to the parent. Use it to disable the
   * submit button — RHF's `setError` paints the field red but does not
   * reliably flip `formState.isValid`, so the caller has to gate submit
   * explicitly.
   */
  onChange?: (isDuplicate: boolean) => void;
}

/**
 * Inline uniqueness check for a form field.
 *
 * Watches the value of `field`, runs the supplied `useExists` hook, and
 * surfaces duplicates by pushing an error into the form's field state
 * (via the RHF adapter). That gives the field the same red border /
 * red-text treatment as any zod error.
 *
 * Renders an indeterminate spinner while a lookup is in flight, and an
 * optional richer hint (e.g. a link to the existing record) when a
 * duplicate is found. Reports the duplicate state up via `onChange` so
 * the caller can gate submit — `setError` paints the field but does not
 * reliably flip `formState.isValid`.
 *
 * Must be a descendant of `<Form.Root>` using the RHF adapter.
 */
export function FormUniquenessGuard<T, A extends unknown[] = []>({
  field,
  useExists,
  existsArgs,
  message,
  renderHint,
  onChange,
}: FormUniquenessGuardProps<T, A>) {
  const value = Form.useWatch(field);
  const stringValue = typeof value === 'string' ? value : '';
  // Skip the lookup until the user actually modifies the field. Avoids a
  // pointless round-trip on edit forms where the field is prefilled with
  // the record's own value.
  const { field: fieldState } = Form.useField(field);
  const effectiveValue = fieldState.isDirty ? stringValue : '';
  const { isChecking, existing } = useExists(effectiveValue, ...((existsArgs ?? []) as A));

  const ctx = Form.useFormContext();
  const rhf = ctx.form.raw as UseFormReturn;

  useEffect(() => {
    if (existing) {
      rhf.setError(field, { type: ERROR_TYPE, message });
    } else {
      // Only clear errors we own — don't trample zod or other validators.
      const current = rhf.getFieldState(field).error;
      if (current?.type === ERROR_TYPE) rhf.clearErrors(field);
    }
    onChange?.(!!existing);
  }, [existing, field, rhf, message, onChange]);

  // Tear down on unmount so a guard that's conditionally rendered doesn't
  // leave the form stuck in an invalid state.
  useEffect(() => {
    return () => {
      const current = rhf.getFieldState(field).error;
      if (current?.type === ERROR_TYPE) rhf.clearErrors(field);
      onChange?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, rhf]);

  if (existing && renderHint) {
    return (
      <Alert variant="warning" className="mt-2">
        <STATUS_ICONS.info size={16} className="mt-1" />
        <AlertDescription>
          <div className="mt-1">{renderHint(existing)}</div>
        </AlertDescription>
      </Alert>
    );
  }

  if (isChecking) {
    return (
      <div className="relative h-0" aria-hidden>
        <STATUS_ICONS.loading className="text-muted-foreground absolute -top-12 right-3 size-6 animate-spin" />
      </div>
    );
  }
  return null;
}
