import { Text } from '@datum-cloud/datum-ui/typography';
import { type ReactNode } from 'react';

interface EntityHeaderProps {
  /** Avatar / icon for the entity. */
  icon?: ReactNode;
  /** Primary display name. */
  name: ReactNode;
  /** Secondary identifier (e.g. account ID, email). */
  subtitle?: ReactNode;
  /** Right-aligned action buttons (Edit, Actions menu, etc.). */
  actions?: ReactNode;
}

/**
 * STUB (#777) — entity header for detail pages: icon + name + secondary id, with
 * action buttons on the right. Visual pass lands in #777.
 */
export function EntityHeader({ icon, name, subtitle, actions }: EntityHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon}
        <div className="flex flex-col">
          <Text size="lg" weight="semibold">
            {name}
          </Text>
          {subtitle && (
            <Text size="sm" textColor="muted">
              {subtitle}
            </Text>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
