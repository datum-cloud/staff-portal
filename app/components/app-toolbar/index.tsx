import { Breadcrumb } from '@/components/breadcrumb';
import { cn } from '@/modules/shadcn/lib/utils';
import { useApp } from '@/providers/app.provider';
import { useLingui } from '@lingui/react/macro';
import React, { useEffect, useState } from 'react';

const AppToolbar = () => {
  const { t } = useLingui();
  const { actions } = useApp();
  const [scrolled, setScrolled] = useState(false);

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
      <Breadcrumb />

      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
};

export default AppToolbar;
