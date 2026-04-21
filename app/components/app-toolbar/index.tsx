import { MobileToolbar } from './mobile-toolbar';
import { Breadcrumb } from '@/components/breadcrumb';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useApp } from '@/providers/app.provider';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useEffect, useState } from 'react';

const AppToolbar = () => {
  const { actions, navigation } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 0);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  if (isMobile) {
    return <MobileToolbar scrolled={scrolled} />;
  }

  return (
    <div
      className={cn(
        'bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 ease-linear',
        scrolled && 'shadow-sm'
      )}>
      <div className="flex min-w-0 items-center gap-4 overflow-hidden">
        <Breadcrumb />
        {navigation}
      </div>

      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
};

export default AppToolbar;
