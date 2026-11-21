import { Form } from '@datum-cloud/datum-ui/form';
import { useEffect } from 'react';
import type { FieldErrors, FieldValues, UseFormReturn } from 'react-hook-form';

/**
 * The dotted paths of every field with an error, such as
 * `listFees.3.amount`, from react-hook-form's nested errors.
 */
export function errorPaths(errors: FieldErrors | undefined, prefix = ''): string[] {
  if (!errors) return [];
  return Object.entries(errors).flatMap(([key, value]) => {
    if (!value || typeof value !== 'object') return [];
    const path = prefix ? `${prefix}.${key}` : key;
    const own = 'message' in value && typeof value.message === 'string' ? [path] : [];
    // Arrays and objects of fields nest their own errors; a field's error
    // has only message, type and ref.
    const nested = Object.entries(value).filter(
      ([child]) => !['message', 'type', 'ref', 'types', 'root'].includes(child)
    );
    return [...own, ...errorPaths(Object.fromEntries(nested) as FieldErrors, path)];
  });
}

/**
 * Shows every field's error once the form has been submitted. Form only
 * shows a field's error after the field is touched, and a submit touches
 * the form's top-level fields only, so an error on a row of fees or the
 * price list, such as a missing amount, stayed hidden and Publish seemed to
 * do nothing. Render it inside Form.Root.
 */
export function ShowSubmitErrors() {
  const { form, markFieldTouched } = Form.useFormContext();
  const raw = form.raw as UseFormReturn<FieldValues>;
  const { submitCount, errors } = raw.formState;

  useEffect(() => {
    if (submitCount === 0) return;
    for (const path of errorPaths(errors)) markFieldTouched(path);
  }, [submitCount, errors, markFieldTouched]);

  return null;
}
