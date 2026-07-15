import { useAssistant } from './assistant-context';
import { STAFF_ASSISTANT_CONFIG } from '@/features/assistant-workspace/staff-config';
import { useApp } from '@/providers/app.provider';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { AnimatePresence, motion } from 'motion/react';
import { lazy, Suspense, useState } from 'react';

// The full-page workspace, reused here as a global slide-up so people can chat
// anywhere without navigating to the dashboard. Lazy so its bundle only loads
// on first open.
const AssistantWorkspace = lazy(() =>
  import('@/features/assistant-workspace').then((m) => ({ default: m.AssistantWorkspace }))
);

function WorkspaceSkeleton() {
  return (
    <div className="flex h-full">
      <div className="bg-background hidden w-12 shrink-0 border-r sm:block" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 p-4">
          <Skeleton className="ml-auto h-10 w-3/5 rounded-2xl" />
          <Skeleton className="h-16 w-4/5 rounded-xl" />
          <Skeleton className="ml-auto h-10 w-2/5 rounded-2xl" />
        </div>
        <div className="px-4 pb-4">
          <Skeleton className="mx-auto h-20 w-full max-w-3xl rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

const MIN_HEIGHT = 150;
const MAX_HEIGHT_RATIO = 0.85;

export function AssistantPanel() {
  const { isOpen } = useAssistant();
  const { user } = useApp();
  const [panelHeight, setPanelHeight] = useState(480);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startY = e.clientY;
    const startHeight = panelHeight;

    const onMove = (e: MouseEvent) => {
      const delta = startY - e.clientY;
      const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;
      setPanelHeight(Math.min(maxHeight, Math.max(MIN_HEIGHT, startHeight + delta)));
    };

    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const startY = e.touches[0].clientY;
    const startHeight = panelHeight;

    const onMove = (e: TouchEvent) => {
      const delta = startY - e.touches[0].clientY;
      const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;
      setPanelHeight(Math.min(maxHeight, Math.max(MIN_HEIGHT, startHeight + delta)));
    };

    const onEnd = () => {
      setIsDragging(false);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="assistant-panel"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          className="bg-card fixed inset-x-0 bottom-0 z-40 flex flex-col border-t shadow-[0_-4px_12px_rgba(0,0,0,0.08)] [clip-path:inset(-20px_0_0_0)]"
          style={{ height: panelHeight }}>
          <div
            className="group absolute top-0 left-1/2 z-10 flex h-4 w-full shrink-0 -translate-x-1/2 cursor-ns-resize items-center justify-center"
            onMouseDown={handleDragStart}
            onTouchStart={handleTouchStart}>
            <div className="bg-muted-foreground/30 group-hover:bg-muted-foreground/60 h-1 w-8 rounded-full transition-colors" />
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden pt-2">
            {isDragging && <div className="absolute inset-0 z-50" />}
            <Suspense fallback={<WorkspaceSkeleton />}>
              <AssistantWorkspace
                config={STAFF_ASSISTANT_CONFIG}
                userName={user?.spec?.givenName}
              />
            </Suspense>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
