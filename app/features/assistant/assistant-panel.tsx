import { useAssistant } from './assistant-context';
import { useSidebar } from '@datum-cloud/datum-ui/sidebar';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { AnimatePresence, motion } from 'motion/react';
import { lazy, Suspense, useState } from 'react';

const ChatPanel = lazy(() => import('./chat/chat-panel').then((m) => ({ default: m.ChatPanel })));

function ChatPanelSkeleton() {
  return (
    <div className="flex h-full">
      {/* Sidebar skeleton */}
      <div className="bg-muted hidden w-[250px] shrink-0 flex-col gap-3 p-3 sm:flex">
        <Skeleton className="h-8 w-full rounded-md" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-5 w-1/2 rounded" />
          <Skeleton className="h-5 w-2/3 rounded" />
        </div>
      </div>

      {/* Resize handle */}
      <div className="bg-muted hidden w-4 shrink-0 sm:block" />

      {/* Chat area skeleton */}
      <div className="bg-muted flex min-w-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 p-4">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="ml-auto h-10 w-3/5 rounded-2xl" />
          <Skeleton className="h-16 w-4/5 rounded-xl" />
          <Skeleton className="ml-auto h-10 w-2/5 rounded-2xl" />
          <Skeleton className="h-20 w-4/5 rounded-xl" />
        </div>

        {/* Input skeleton */}
        <div className="px-2 pb-2">
          <div className="mx-auto sm:w-1/2">
            <Skeleton className="h-12 w-full rounded-[28px]" />
            <Skeleton className="mx-auto mt-1 h-3 w-40 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

const MIN_HEIGHT = 150;
const MAX_HEIGHT_RATIO = 0.8;

export function AssistantPanel() {
  const { isOpen } = useAssistant();
  const { state, isMobile } = useSidebar();
  const [panelHeight, setPanelHeight] = useState(400);
  const [isDragging, setIsDragging] = useState(false);

  const sidebarLeft = isMobile
    ? '0px'
    : state === 'expanded'
      ? 'var(--sidebar-width)'
      : 'var(--sidebar-width-icon)';

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
          className="dark:bg-accent bg-card fixed right-0 bottom-0 z-40 flex flex-col border-t shadow-[0_-4px_12px_rgba(0,0,0,0.08)] transition-[left] duration-200 ease-linear [clip-path:inset(-20px_0_0_0)]"
          style={{ left: sidebarLeft, height: panelHeight }}>
          <div
            className="group absolute top-0 left-1/2 z-10 flex h-4 w-full shrink-0 -translate-x-1/2 cursor-ns-resize items-center justify-center bg-none"
            onMouseDown={handleDragStart}
            onTouchStart={handleTouchStart}>
            <div className="bg-muted-foreground/30 group-hover:bg-muted-foreground/60 h-1 w-8 rounded-full transition-colors" />
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            {isDragging && <div className="absolute inset-0 z-50" />}
            <Suspense fallback={<ChatPanelSkeleton />}>
              <ChatPanel />
            </Suspense>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
