import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Brain } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { lazy, Suspense, useState } from 'react';

const ChatPanel = lazy(() => import('./chat/chat-panel').then((m) => ({ default: m.ChatPanel })));

const MIN_HEIGHT = 150;
const MAX_HEIGHT_RATIO = 0.8;

export function AssistantBottomBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(400);
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
    <div className="relative">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="dark:bg-accent bg-card absolute right-0 bottom-full left-0 z-40 flex flex-col border-t shadow-[0_-4px_12px_rgba(0,0,0,0.08)] [clip-path:inset(-20px_0_0_0)]"
            style={{ height: panelHeight }}>
            <div
              className="group absolute top-0 left-1/2 z-10 flex h-4 w-full shrink-0 -translate-x-1/2 cursor-ns-resize items-center justify-center bg-none"
              onMouseDown={handleDragStart}
              onTouchStart={handleTouchStart}>
              <div className="bg-muted-foreground/30 group-hover:bg-muted-foreground/60 h-1 w-8 rounded-full transition-colors" />
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              {isDragging && <div className="absolute inset-0 z-50" />}
              <Suspense fallback={<div className="h-full w-full" />}>
                <ChatPanel />
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-background relative z-50 flex h-12 items-center justify-end overflow-hidden border-t">
        <div className="border-sidebar-border flex h-full items-center gap-1 border-l px-4">
          <span className="text-foreground mr-2 text-xs">Developer Tools</span>
          <Tooltip message="Patch AI" side="top">
            <button
              type="button"
              onClick={() => setIsOpen((o) => !o)}
              aria-label="Patch AI"
              className={cn(
                'h-7 w-7 rounded-lg p-0',
                'flex items-center justify-center',
                isOpen ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent'
              )}>
              <Brain className="text-foreground size-4" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
