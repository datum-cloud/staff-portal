// Import the module directly, not the `@/utils/cookies` barrel: that barrel
// also re-exports cookies built on `@/utils/config/env.server`, a
// server-only module this client hook must not drag into the browser bundle.
import { parseSidebarState } from '@/utils/cookies/sidebar';
import { useEffect, useState } from 'react';

/**
 * D3: the rail's open/closed preference survives navigating between sections
 * and entities — plain `useState` inside `MiloSubNav` would reset on every
 * remount (e.g. entering/leaving an entity detail page).
 *
 * `MiloSubNav` itself never remounts between showing a section's rail and an
 * entity's rail (same position/type in `MiloShell`'s tree across a
 * client-side navigation) — so `defaultCollapsed` can change from one render
 * to the next (e.g. Customers' `true` vs. an entity's D4 `false`) without a
 * fresh mount. Baking that into `useState`'s initial value would only apply
 * it once, on whichever rail happened to mount first, and then ignore every
 * later `defaultCollapsed` change. Instead, only an *explicit* user
 * preference (from the cookie, or set via `setOpen`) is kept in state;
 * absent one, `open` always reflects the caller's current `defaultCollapsed`.
 *
 * Since `MiloSubNav` moved onto datum-ui's `Sidebar` (see the sub-nav parity
 * plan's Phase 2), the `sidebar_state` cookie is written by
 * `SidebarProvider` itself (inside its `setOpen`) whenever this hook's
 * `setOpen` is wired to the provider's `onOpenChange` — this hook no longer
 * writes the cookie itself, only reads it once on mount as a fallback for
 * whatever the root loader didn't already resolve (`initialOpen`).
 *
 * `initialOpen` is the value the root loader already resolved server-side
 * from that cookie (see `app/root.tsx`) — passing it in lets the first
 * render already be correct, instead of rendering the SSR default and
 * correcting a moment later. It's optional because not every mount goes
 * through the root loader (e.g. Cypress component tests mount `MiloSubNav`
 * directly) — those fall back to reading `document.cookie` once on mount,
 * mirroring `useBreakpoint`'s pattern: a safe default for the first render,
 * corrected from the client-only source once mounted, to avoid a hydration
 * mismatch.
 */
export function useSubNavOpen(
  defaultCollapsed: boolean,
  initialOpen?: boolean
): [boolean, (open: boolean) => void] {
  // `undefined` = no explicit preference recorded yet.
  const [explicitOpen, setExplicitOpen] = useState<boolean | undefined>(initialOpen);

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
      if (stored !== undefined) setExplicitOpen(stored);
    };

    // Only ever runs once on mount, mirroring useBreakpoint.
    readStored();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = explicitOpen ?? !defaultCollapsed;

  return [open, setExplicitOpen];
}
