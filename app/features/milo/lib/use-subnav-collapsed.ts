import { useCallback, useEffect, useState } from 'react';

/**
 * D3: the rail's collapsed/expanded preference survives navigating between
 * sections and entities — it used to live in `MiloSubNav`'s local `useState`,
 * which reset on every remount (e.g. entering/leaving an entity detail page).
 *
 * SSR default is the caller's `defaultCollapsed` (mirrors `useBreakpoint`'s
 * pattern: a safe default for the first render, corrected from storage once
 * mounted, to avoid a hydration mismatch).
 */
const STORAGE_KEY = 'datum:staff-subnav-collapsed';

export function useSubNavCollapsed(
  defaultCollapsed: boolean
): [boolean, (next: boolean | ((collapsed: boolean) => boolean)) => void] {
  const [collapsed, setCollapsedState] = useState(defaultCollapsed);

  useEffect(() => {
    // Mirrors `useBreakpoint`'s shape: read once on mount, then subscribe so a
    // change from another tab (or another rail instance) stays in sync.
    const readStored = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(STORAGE_KEY);
      } catch {
        // localStorage may be unavailable (private mode, disabled storage, etc.)
      }
      setCollapsedState(stored !== null ? stored === 'true' : defaultCollapsed);
    };

    readStored();
    window.addEventListener('storage', readStored);
    return () => window.removeEventListener('storage', readStored);
    // Only ever read storage on mount/storage-event — `defaultCollapsed` intentionally isn't a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCollapsed = useCallback((next: boolean | ((collapsed: boolean) => boolean)) => {
    setCollapsedState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      try {
        localStorage.setItem(STORAGE_KEY, String(value));
      } catch {
        // localStorage may be unavailable
      }
      return value;
    });
  }, []);

  return [collapsed, setCollapsed];
}
