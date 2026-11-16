import { ATTENTION_TABS, type AttentionTab } from '../lib/needs-attention';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/** DOM id of the "Needs attention" card, so the health strip can scroll to it. */
export const NEEDS_ATTENTION_ID = 'needs-attention';

const PARAM = 'attention';

const isTab = (value: string | null): value is AttentionTab =>
  (ATTENTION_TABS as readonly string[]).includes(value ?? '');

/**
 * The "Needs attention" tab, kept in the URL (`?attention=compute`) so a
 * filtered view can be shared and the health strip's tiles can open it.
 *
 * Uses React Router's search params directly: nuqs's `useQueryState` fails
 * during server rendering here ("useNavigate() may be used only in the context
 * of a <Router>"), as its adapter ends up with its own copy of the router.
 */
export function useAttentionTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(PARAM);
  const tab: AttentionTab = isTab(value) ? value : 'all';

  const setTab = useCallback(
    (next: AttentionTab) => {
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous);
          if (next === 'all') params.delete(PARAM);
          else params.set(PARAM, next);
          return params;
        },
        { replace: true, preventScrollReset: true }
      );
    },
    [setSearchParams]
  );

  /** Switch to a tab and bring the list into view (what a strip tile does). */
  const openTab = useCallback(
    (next: AttentionTab) => {
      setTab(next);
      document
        .getElementById(NEEDS_ATTENTION_ID)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [setTab]
  );

  return { tab, setTab, openTab };
}
