import { SECTION_CARD_CHROME } from '../../lib/card-chrome';
import { Card, CardTitle } from '@datum-cloud/datum-ui/card';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { ReactNode } from 'react';

type TableCardProps = {
  title?: ReactNode;
  /** Right-aligned header action (e.g. “See all”). */
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  /**
   * When true (default), children sit in the Figma nested table frame:
   * full width of the padded card body, `rounded-sm` + `#efefed` border.
   * Set false when the child already provides its own frame (e.g. GroupedTable).
   */
  framed?: boolean;
  children: ReactNode;
};

/**
 * Overview “card with table” from Figma:
 * - Outer card: 24px padding, 20px gap, soft chrome
 * - Title / “See all” row
 * - Nested bordered table frame that fills the content width (not edge-bleed)
 *
 * @see https://www.figma.com/design/bBEQ8YeTP4SngNl5EkkQdH/Datum---Master-Design-File?node-id=14079-79005
 */
export function TableCard({
  title,
  action,
  className,
  contentClassName,
  framed = true,
  children,
}: TableCardProps) {
  const hasHeader = title != null || action != null;

  return (
    <Card
      className={cn(SECTION_CARD_CHROME, 'gap-5 overflow-hidden rounded-xl p-6', className)}
      data-slot="table-card">
      {hasHeader && (
        <div
          className="flex w-full flex-row items-start justify-between gap-4"
          data-slot="table-card-header">
          {title != null ? (
            <CardTitle className="text-base font-medium">{title}</CardTitle>
          ) : (
            <span />
          )}
          {action != null && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div
        className={cn(
          'w-full min-w-0',
          framed && 'dark:border-border overflow-hidden rounded-sm border border-[#efefed]',
          contentClassName
        )}
        data-slot="table-card-body">
        {children}
      </div>
    </Card>
  );
}
