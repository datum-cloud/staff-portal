import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  /** Optional icon shown in a muted circle above the title. */
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  /** Optional action (usually a Button) shown below the copy. */
  action?: ReactNode;
  /** `md` (default) for a full section; `sm` for tight inline spots. */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Centered empty-state placeholder — icon, title, description, optional action.
 * Use anywhere a list/table/section has no data, instead of a bare line of text.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 text-center',
        size === 'md' ? 'px-4 py-10' : 'px-3 py-6',
        className
      )}
      data-slot="empty-state">
      {Icon && (
        <div
          className={cn(
            'bg-muted text-muted-foreground flex items-center justify-center rounded-full',
            size === 'md' ? 'size-11' : 'size-9'
          )}>
          <Icon className={size === 'md' ? 'size-5' : 'size-4'} />
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        <Text weight="medium" size="sm">
          {title}
        </Text>
        {description && (
          <Text size="sm" textColor="muted" className="max-w-sm">
            {description}
          </Text>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
