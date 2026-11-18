import { useState } from 'react';

export interface ShowMore<T> {
  /** The items to render: the first `limit`, or all of them once expanded. */
  shown: T[];
  /** How many items are folded away; 0 when everything is shown. */
  hidden: number;
  /** True when more items could still appear below the shown ones (expanded, or under the limit). */
  roomForMore: boolean;
  showAll: () => void;
  /** Folds back to the first `limit`, e.g. when the list's filter changes. */
  reset: () => void;
}

/** Shows the first `limit` items of a long list until the user asks for the rest. */
export function useShowMore<T>(items: readonly T[], limit: number): ShowMore<T> {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? [...items] : items.slice(0, limit);
  return {
    shown,
    hidden: items.length - shown.length,
    roomForMore: expanded || shown.length < limit,
    showAll: () => setExpanded(true),
    reset: () => setExpanded(false),
  };
}
