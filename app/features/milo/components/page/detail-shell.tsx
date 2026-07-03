import { EntityHeader, type EntityHeaderProps } from './entity-header';
import { EntityTabNav, type EntityTab } from './entity-tab-nav';
import { Outlet } from 'react-router';

interface DetailShellProps extends EntityHeaderProps {
  /** Tabs for the sticky nav under the header. */
  tabs: EntityTab[];
}

/**
 * Layout shell for entity detail pages (#777): padded {@link EntityHeader},
 * sticky {@link EntityTabNav}, then the routed tab content. Detail layouts just
 * declare the header props + tabs instead of repeating this skeleton.
 */
export function DetailShell({ tabs, ...header }: DetailShellProps) {
  return (
    <div className="flex flex-col">
      <div className="px-4 pt-4">
        <EntityHeader {...header} />
      </div>
      <EntityTabNav tabs={tabs} />
      <Outlet />
    </div>
  );
}
