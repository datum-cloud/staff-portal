import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

type ActionCardVariant = 'warning' | 'success' | 'destructive' | 'info';

interface ActionCardProps {
  variant: ActionCardVariant;
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  /** Action element (usually a Button). Caller owns onClick / loading / type. */
  action?: ReactNode;
  className?: string;
}

type TextColor = 'warning' | 'success' | 'destructive' | 'info';

const variantStyles: Record<ActionCardVariant, { container: string; color: TextColor }> = {
  warning: {
    container: 'border-warning bg-warning/10',
    color: 'warning',
  },
  success: {
    container: 'border-success bg-success/10',
    color: 'success',
  },
  destructive: {
    container: 'border-destructive bg-destructive/5',
    color: 'destructive',
  },
  info: {
    container: 'border-info bg-info/10',
    color: 'info',
  },
};

/**
 * Callout banner with an icon, title, description, and an action slot
 * (typically a Button).
 *
 * Desktop (≥768px): content on the left, action right-aligned — single row.
 *
 * Mobile: content stacks above the action row. Text can't be crushed by the
 * button, and the button sits right-aligned on its own line.
 *
 * Used for reactivate / deactivate / delete style callouts.
 */
export function ActionCard({
  variant,
  icon: Icon,
  title,
  description,
  action,
  className,
}: ActionCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-4',
        'md:flex-row md:items-center md:justify-between md:gap-4',
        styles.container,
        className
      )}
      data-slot="action-card">
      <div className="min-w-0 flex-1">
        <Title
          level={6}
          weight="medium"
          textColor={styles.color}
          className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          {title}
        </Title>
        {description && (
          <Text textColor={styles.color} size="sm" as="p">
            {description}
          </Text>
        )}
      </div>
      {action && <div className="flex shrink-0 justify-end">{action}</div>}
    </div>
  );
}
