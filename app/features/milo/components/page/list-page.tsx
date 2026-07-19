import { HEADER_STACK_H } from '../../lib/dimensions';
import { type ReactNode } from 'react';

interface ListPageProps {
  /** The list body — typically a `<ListTable>`, which owns the header, filter sidebar, and table. */
  children: ReactNode;
}

/**
 * Page surface for list views (#778). White canvas pinned to the viewport height
 * below the navbar+context bar, so `<ListTable>` can scroll its sidebar and table
 * independently. Height scoped here (not the shell) to leave detail pages alone.
 */
export function ListPage({ children }: ListPageProps) {
  return (
    <div
      // Overflow stays visible so the filter show/hide control can sit on the
      // sub-nav border (half outside) when the filter rail is collapsed.
      // Height is pinned below; ListTable owns its own scroll regions.
      className="bg-card flex flex-col overflow-visible"
      style={{ height: `calc(100svh - ${HEADER_STACK_H}px)` }}>
      {children}
    </div>
  );
}
