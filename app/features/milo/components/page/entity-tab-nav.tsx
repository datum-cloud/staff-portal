import { HEADER_STACK_H } from '../../lib/dimensions';
import { TabStrip, type EntityTab } from './tab-strip';

export type { EntityTab, EntityTabChild } from './tab-strip';

interface EntityTabNavProps {
  tabs: EntityTab[];
}

/**
 * Horizontal tab nav for entity detail pages (#777), replacing the legacy
 * SubLayout left sidebar. A sticky wrapper (just below the navbar + context bar)
 * around the shared {@link TabStrip}, so the tab bar stays reachable while the
 * page content scrolls.
 */
export function EntityTabNav({ tabs }: EntityTabNavProps) {
  return (
    <div className="bg-background sticky z-10 px-4 py-3" style={{ top: HEADER_STACK_H }}>
      <TabStrip tabs={tabs} />
    </div>
  );
}
