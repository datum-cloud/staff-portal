import type { ModelOption } from '../types';
import { useEffect, useState } from 'react';

/**
 * Load the AI gateway model catalog via the staff-portal proxy.
 * Returns an empty list until the request succeeds (picker stays empty / hidden options).
 */
export function useAssistantModels() {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/assistant/models')
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Failed to load models (${res.status})`);
        }
        return res.json() as Promise<{ models?: ModelOption[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setModels(Array.isArray(data.models) ? data.models : []);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setModels([]);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { models, isLoading, error };
}
