import { cn } from '@/modules/shadcn/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/modules/shadcn/ui/breadcrumb';
import { useApp } from '@/providers/app.provider';
import { useLingui } from '@lingui/react/macro';
import React from 'react';
import { useEffect, useState } from 'react';
import { useMatches } from 'react-router';

const AppToolbar = () => {
  const { t } = useLingui();
  const { actions } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const matches = useMatches();
  const crumbs = matches
    .filter((match: any) => Boolean(match.handle?.breadcrumb))
    .map((match: any) => ({
      path: match.pathname,
      name: match.handle.breadcrumb(match.data),
    }));

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 0);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div
      className={cn(
        'bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 ease-linear',
        scrolled && 'shadow-sm'
      )}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink href="/">{t`Dashboard`}</BreadcrumbLink>
          </BreadcrumbItem>
          {crumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.path}>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                {idx === crumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.path}>{crumb.name}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      {actions}
    </div>
  );
};

export default AppToolbar;
