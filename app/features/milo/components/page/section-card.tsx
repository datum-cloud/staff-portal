import { SECTION_CARD_CHROME } from '../../lib/card-chrome';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { ReactNode } from 'react';

type SectionCardProps = {
  title?: ReactNode;
  description?: ReactNode;
  /** Right-aligned header slot (e.g. “See all”, buttons). */
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
};

/**
 * Standard content card matching Figma overview cards:
 * rounded-xl, soft shadow, 24px padding, optional title/action header.
 */
export function SectionCard({
  title,
  description,
  action,
  className,
  contentClassName,
  children,
}: SectionCardProps) {
  const hasHeader = title != null || description != null || action != null;

  return (
    <Card className={cn(SECTION_CARD_CHROME, 'gap-0 py-0', className)} data-slot="section-card">
      {hasHeader && (
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 px-6 pt-6 pb-0">
          <div className="min-w-0 flex-1 space-y-1">
            {title != null && <CardTitle className="text-base font-medium">{title}</CardTitle>}
            {description != null && <CardDescription>{description}</CardDescription>}
          </div>
          {action != null && <div className="shrink-0">{action}</div>}
        </CardHeader>
      )}
      <CardContent className={cn('px-6 pb-6', hasHeader ? 'pt-4' : 'pt-6', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
