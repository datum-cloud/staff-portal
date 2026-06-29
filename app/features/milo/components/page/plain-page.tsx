import { Title } from '@datum-cloud/datum-ui/typography';
import { type ReactNode } from 'react';

interface PlainPageProps {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Page template for free-form content (forms, dashboards): an optional header
 * (title + actions) above the content. 24px padding, no Card wrapper — matches
 * the Milo list/detail content rhythm.
 */
export function PlainPage({ title, actions, children }: PlainPageProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4">
          {title && (
            <Title as="h1" className="text-xl font-semibold">
              {title}
            </Title>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
