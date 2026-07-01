import { HEADER_STACK_H } from '../../lib/dimensions';
import { type ReactNode } from 'react';

interface ListPageProps {
  /** The list body — typically a `<ListTable>`, which owns the header, filter sidebar, and table. */
  children: ReactNode;
  /** Optional tab bar (e.g. Resources → AI Edge / DNS / Domains) rendered above the table, inside the surface. */
  tabs?: ReactNode;
}

/**
 * Page surface for list views (#778). White canvas pinned to the viewport height
 * below the navbar+context bar, so `<ListTable>` can scroll its sidebar and table
 * independently. Height scoped here (not the shell) to leave detail pages alone.
 */
export function ListPage({ children, tabs }: ListPageProps) {
  return (
    <div
      className="bg-card flex flex-col overflow-hidden"
      style={{ height: `calc(100svh - ${HEADER_STACK_H}px)` }}>
      {tabs && <div className="shrink-0 px-6 pt-4 pb-1">{tabs}</div>}
      {children}
    </div>
  );
}
