// Import the module directly, not the `@/utils/cookies` barrel: that barrel
// also re-exports cookies built on `@/utils/config/env.server`, a
// server-only module this client hook must not drag into the browser bundle.
import { parseSidebarState, SIDEBAR_COOKIE_NAME } from '@/utils/cookies/sidebar';
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
 * preference (from the cookie, or set via `setCollapsed`) is kept in state;
 * absent one, `collapsed` always reflects the caller's current
 * `defaultCollapsed`.
 *
 * The preference lives in a cookie rather than `localStorage`, in the exact
 * format datum-ui's own `Sidebar` component writes it (see
 * `app/utils/cookies/sidebar.ts`) — a deliberate choice, not an accident: it
 * means a future move onto that component (see the sub-nav parity plan)
 * inherits today's preference for free, with no migration. That format
 * stores `open` (expanded), the inverse of this hook's `collapsed` — the
 * conversion happens at the read/write boundary below, so callers still see
 * `collapsed` throughout.
 *
 * `initialOpen` is the value the root loader already resolved server-side
 * from that same cookie (see `app/root.tsx`) — passing it in lets the first
 * render already be correct, instead of rendering the SSR default and
 * correcting a moment later. It's optional because not every mount goes
 * through the root loader (e.g. Cypress component tests mount `MiloSubNav`
 * directly) — those fall back to reading `document.cookie` once on mount,
 * mirroring `useBreakpoint`'s pattern: a safe default for the first render,
 * corrected from the client-only source once mounted, to avoid a hydration
 * mismatch.
 */
export function useSubNavCollapsed(
  defaultCollapsed: boolean,
  initialOpen?: boolean
): [boolean, (next: boolean | ((collapsed: boolean) => boolean)) => void] {
  // `null` = no explicit preference recorded yet.
  const [openOverride, setOpenOverride] = useState<boolean | null>(initialOpen ?? null);

  useEffect(() => {
    // Already resolved server-side (the common case, anything under the Milo
    // shell) — nothing to correct on mount.
    if (initialOpen !== undefined) return;

    const readStored = () => {
      let stored: boolean | undefined;
      try {
        stored = parseSidebarState(document.cookie);
      } catch {
        // document.cookie may be unavailable (rare, but matches the old
        // localStorage try/catch this replaces).
      }
      setOpenOverride(stored ?? null);
    };

    // Only ever runs once on mount, mirroring useBreakpoint — cookies have no
    // 'storage' event to subscribe to for cross-tab sync.
    readStored();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const collapsed = openOverride !== null ? !openOverride : defaultCollapsed;

  const setCollapsed = useCallback(
    (next: boolean | ((collapsed: boolean) => boolean)) => {
      setOpenOverride((prevOpen) => {
        const prevCollapsed = prevOpen !== null ? !prevOpen : defaultCollapsed;
        const nextCollapsed = typeof next === 'function' ? next(prevCollapsed) : next;
        const nextOpen = !nextCollapsed;
        try {
          document.cookie = `${SIDEBAR_COOKIE_NAME}=${nextOpen}; path=/; max-age=604800`;
        } catch {
          // document.cookie may be unavailable
        }
        return nextOpen;
      });
    },
    [defaultCollapsed]
  );

  return [collapsed, setCollapsed];
}
