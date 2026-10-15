import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

// Matches cloud-portal's project home columns (app/features/project/home/resource-column.tsx):
// a fixed-height body with room for five 40px rows, so the three columns line up.
export const COLUMN_BODY_CLASS = 'h-50';
export const COLUMN_ROW_CLASS = 'flex h-10 items-center gap-2 rounded-md px-2';

interface HomeColumnProps {
  title: ReactNode;
  href: string;
  count?: ReactNode;
  action?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}

export function HomeColumn({
  title,
  href,
  count,
  action,
  bodyClassName,
  children,
}: HomeColumnProps) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <header className="flex h-7 shrink-0 items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2">
          <Link
            to={href}
            className="text-foreground flex min-w-0 items-center gap-1 text-sm font-medium">
            <span className="truncate">{title}</span>
            <Icon
              icon={ChevronRight}
              size={14}
              className="text-icon-quaternary shrink-0"
              aria-hidden
            />
          </Link>
          {count != null && (
            <Text as="span" size="xs" textColor="muted" className="tabular-nums">
              {count}
            </Text>
          )}
        </h2>
        {action}
      </header>
      <div className={cn(COLUMN_BODY_CLASS, bodyClassName)}>{children}</div>
    </section>
  );
}

interface HomeColumnRowProps {
  to: string;
  icon: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
}

export function HomeColumnRow({ to, icon, label, meta }: HomeColumnRowProps) {
  return (
    <Link to={to} className={cn(COLUMN_ROW_CLASS, 'hover:bg-accent transition-colors')}>
      {icon}
      <Text size="sm" ellipsis className="min-w-0 flex-1">
        {label}
      </Text>
      {meta}
    </Link>
  );
}

export function HomeColumnSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={COLUMN_ROW_CLASS}>
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 flex-1 rounded" />
          <Skeleton className="h-3 w-10 rounded" />
        </div>
      ))}
    </div>
  );
}

export function HomeColumnEmpty({ icon, message }: { icon: LucideIcon; message: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="bg-muted border-border text-icon-secondary flex size-9 items-center justify-center rounded-lg border">
        <Icon icon={icon} size={16} aria-hidden />
      </div>
      <Text size="sm" textColor="muted">
        {message}
      </Text>
    </div>
  );
}
