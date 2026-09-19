import { useCallback, useEffect, useState } from 'react';

/**
 * D3: the rail's collapsed/expanded preference survives navigating between
 * sections and entities — it used to live in `MiloSubNav`'s local `useState`,
 * which reset on every remount (e.g. entering/leaving an entity detail page).
 *
 * `MiloSubNav` itself never remounts between showing a section's rail and an
 * entity's rail (same position/type in `MiloShell`'s tree across a
 * client-side navigation) — so `defaultCollapsed` can change from one render
 * to the next (e.g. Customers' `true` vs. an entity's D4 `false`) without a
 * fresh mount. Baking that into `useState`'s initial value would only apply
 * it once, on whichever rail happened to mount first, and then ignore every
 * later `defaultCollapsed` change. Instead, only an *explicit* user
 * preference (read from storage, or set via `setCollapsed`) is kept in
 * state; absent one, `collapsed` always reflects the caller's current
 * `defaultCollapsed`.
 *
 * SSR default is the caller's `defaultCollapsed` (mirrors `useBreakpoint`'s
 * pattern: a safe default for the first render, corrected from storage once
 * mounted, to avoid a hydration mismatch).
 */
const STORAGE_KEY = 'datum:staff-subnav-collapsed';

export function useSubNavCollapsed(
  defaultCollapsed: boolean
): [boolean, (next: boolean | ((collapsed: boolean) => boolean)) => void] {
  // `null` = no explicit preference recorded yet.
  const [override, setOverride] = useState<boolean | null>(null);

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
      setOverride(stored !== null ? stored === 'true' : null);
    };

    readStored();
    window.addEventListener('storage', readStored);
    return () => window.removeEventListener('storage', readStored);
  }, []);

  const collapsed = override ?? defaultCollapsed;

  const setCollapsed = useCallback(
    (next: boolean | ((collapsed: boolean) => boolean)) => {
      setOverride((prev) => {
        const value = typeof next === 'function' ? next(prev ?? defaultCollapsed) : next;
        try {
          localStorage.setItem(STORAGE_KEY, String(value));
        } catch {
          // localStorage may be unavailable
        }
        return value;
      });
    },
    [defaultCollapsed]
  );

  return [collapsed, setCollapsed];
}
