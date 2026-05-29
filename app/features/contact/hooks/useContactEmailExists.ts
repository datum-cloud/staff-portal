import { useContactListQuery } from '@/resources/request/client';
import type { ComMiloapisNotificationV1Alpha1Contact } from '@openapi/notification.miloapis.com/v1alpha1';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

const EMAIL = z.email();

/**
 * Async existence check for a contact email — backs the inline duplicate
 * hint on the create/edit form. Issues a server-side `spec.email=` field
 * selector lookup once the input parses as an email and stops changing.
 *
 * Pass `ignoreContactName` in edit mode so the form doesn't flag the
 * contact being edited as a duplicate of itself.
 */
export function useContactEmailExists(
  email: string,
  ignoreContactName?: string,
  debounceMs = 400
): {
  isChecking: boolean;
  existing: ComMiloapisNotificationV1Alpha1Contact | undefined;
} {
  const [debounced, setDebounced] = useState(email);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(email), debounceMs);
    return () => clearTimeout(id);
  }, [email, debounceMs]);

  const trimmed = debounced.trim();
  const hasValidShape = trimmed.length > 0 && EMAIL.safeParse(trimmed).success;

  const query = useContactListQuery(hasValidShape ? { search: trimmed, limit: 5 } : undefined);

  const existing = useMemo(() => {
    if (!hasValidShape) return undefined;
    const lower = trimmed.toLowerCase();
    return (query.data?.items ?? []).find(
      (c) => (c.spec?.email ?? '').toLowerCase() === lower && c.metadata?.name !== ignoreContactName
    );
  }, [query.data, hasValidShape, trimmed, ignoreContactName]);

  return {
    isChecking: hasValidShape && query.isFetching,
    existing,
  };
}
