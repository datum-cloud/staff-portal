import { useApp } from '@/providers/app.provider';
import { Text } from '@datum-cloud/datum-ui/typography';
import { type ReactNode } from 'react';

export interface EntityHeaderProps {
  /** Avatar / icon for the entity. */
  icon?: ReactNode;
  /** Primary display name. */
  name: ReactNode;
  /** Secondary identifier (e.g. account ID, email). */
  subtitle?: ReactNode;
  /** Layout-specific actions, rendered before the child route's `<AppActionBar>` actions. */
  actions?: ReactNode;
}

/**
 * Entity header for detail pages: icon + name + secondary id, with actions on
 * the right. Child routes inject their CTAs via `<AppActionBar>` and we read
 * them here (`useApp`), so detail layouts don't each wire `useApp → actions`.
 */
export function EntityHeader({ icon, name, subtitle, actions }: EntityHeaderProps) {
  const { actions: registeredActions } = useApp();
  const hasActions = actions != null || registeredActions.length > 0;

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
      {hasActions && (
        <div className="flex items-center gap-2">
          {actions}
          {registeredActions}
        </div>
      )}
    </div>
  );
}
