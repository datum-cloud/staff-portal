import { cn } from '@/modules/shadcn/lib/utils';
import { useApp } from '@/providers/app.provider';
import { useEffect, useState } from 'react';

const AppToolbar = () => {
  const { actions } = useApp();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 0);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  if (actions.length === 0) return null;

  return (
    <div
      className={cn(
        'bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center justify-end gap-2 border-b px-4 ease-linear',
        scrolled && 'shadow-sm'
      )}>
      {actions}
    </div>
  );
};

export default AppToolbar;
