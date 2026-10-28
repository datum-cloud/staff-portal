import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ReactNode } from 'react';

interface PageHeaderProps {
  /** Main heading — renders as h1 */
  title: ReactNode;
  /** Optional subtitle / description shown under the title */
  description?: ReactNode;
  /** Optional action buttons shown on the right (desktop) / second row (mobile) */
  actions?: ReactNode;
  className?: string;
}

/**
 * Responsive page header used on detail pages. Renders a title (+ optional
 * description) and an optional row of action buttons.
 *
 * Desktop (≥768px): title and actions sit on a single row with the actions
 * right-aligned — the historical layout.
 *
 * Mobile: title stacks above the action row. Actions are horizontally
 * scrollable so they can never crowd or wrap off the viewport.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4',
        className
      )}
      data-slot="page-header">
      <div className="flex min-w-0 flex-col">
        <Title level={1} className="truncate">
          {title}
        </Title>
        {description && (
          <Text textColor="muted" className="truncate">
            {description}
          </Text>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 overflow-x-auto md:overflow-visible [&>*]:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
