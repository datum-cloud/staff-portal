import { EntityHeader } from './entity-header';
import { EntityTabNav, type EntityTab } from './entity-tab-nav';
import { type ReactNode } from 'react';

interface DetailPageProps {
  icon?: ReactNode;
  name: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  tabs: EntityTab[];
  children: ReactNode;
}

/**
 * STUB (#777) — page template for entity detail views: EntityHeader + horizontal
 * EntityTabNav + tab content. Replaces the legacy SubLayout left-sidebar layout.
 */
export function DetailPage({ icon, name, subtitle, actions, tabs, children }: DetailPageProps) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <EntityHeader icon={icon} name={name} subtitle={subtitle} actions={actions} />
      <EntityTabNav tabs={tabs} />
      <div>{children}</div>
    </div>
  );
}
