import { FILTER_W } from '../../lib/dimensions';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { type ReactNode } from 'react';

interface ListPageProps {
  title: ReactNode;
  /** Optional total count shown next to the title, e.g. "Organizations (124)". */
  count?: number;
  /** Primary CTA slot (right of the header). */
  actions?: ReactNode;
  /** Optional left filter panel (#778 RichFilterPanel). Omit ⇒ table spans full width. */
  filters?: ReactNode;
  /** The table / list body. */
  children: ReactNode;
}

/**
 * Page template for list views (#778). Header (title + count + CTA) over a body
 * that is either [filter panel | table] or just the table when no `filters` are
 * provided. The filter panel is independent of the shell's sub-nav — a page can
 * have both, either, or neither.
 */
export function ListPage({ title, count, actions, filters, children }: ListPageProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-4">
        <Title as="h1" className="text-xl font-semibold">
          {title}
          {typeof count === 'number' && (
            <Text as="span" textColor="muted" weight="normal" className="ml-2">
              ({count})
            </Text>
          )}
        </Title>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div className="flex flex-1">
        {filters && (
          <div style={{ width: FILTER_W }} className="shrink-0 border-r px-4 py-4">
            {filters}
          </div>
        )}
        <div className="min-w-0 flex-1 px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}
