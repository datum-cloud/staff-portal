import { useDockWidth } from '../hooks/use-dock-width';
import { useAssistant } from './assistant-context';
import { HEADER_STACK_H } from '@/features/milo/lib/dimensions';
import { useApp } from '@/providers/app.provider';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { cn } from '@datum-cloud/datum-ui/utils';
import { lazy, Suspense, useState } from 'react';

// The workspace in its vertical (docked) layout. Lazy so its bundle only loads
// on first open. The staff config loads in the same lazy import because it
// imports `@datum-cloud/datum-ui/assistant` (streamdown, shiki, mermaid,
// tiptap); a static import here put that on every page rendering the panel.
const AssistantWorkspace = lazy(() =>
  Promise.all([import('./assistant-workspace'), import('../staff-config')]).then(
    ([workspace, { STAFF_ASSISTANT_CONFIG }]) => ({
      default: ({ userName, onClose }: { userName?: string; onClose: () => void }) => (
        <workspace.AssistantWorkspace
          config={STAFF_ASSISTANT_CONFIG}
          userName={userName}
          orientation="vertical"
          onClose={onClose}
        />
      ),
    })
  )
);

// Mirrors the vertical workspace's empty state: a top bar, then a centered
// greeting, composer, and suggestion rows. Keeps the layout from jumping when
// the lazy chunk resolves.
function WorkspaceSkeleton() {
  return (
    <div className="bg-background flex h-full w-full flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-2">
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>
      <div className="flex w-full flex-1 flex-col justify-center px-4 py-8">
        <div className="mb-8 flex flex-col items-center">
          <Skeleton className="mb-4 size-16 rounded-full" />
          <Skeleton className="h-8 w-48 rounded-lg" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="mt-4 flex flex-col gap-1">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * The assistant docked to the right of the page content, like cloud-portal's
 * project dock. On desktop it's a flex sibling of <main>, so opening it narrows
 * the content instead of covering it; below `md` it overlays from the right.
 * Once opened it stays mounted, so closing it doesn't lose a running chat.
 */
export function AssistantPanel() {
  const { isOpen, close } = useAssistant();
  const { user } = useApp();
  const { width, resizing, handleProps } = useDockWidth();
  // Mount the workspace on first open, then keep it mounted across closes.
  const [hasOpened, setHasOpened] = useState(false);
  if (isOpen && !hasOpened) setHasOpened(true);

  return (
    <aside
      aria-label="Patch AI"
      aria-hidden={!isOpen}
      inert={!isOpen}
      style={
        {
          '--dock-width': `${width}px`,
          '--dock-top': `${HEADER_STACK_H}px`,
        } as React.CSSProperties
      }
      className={cn(
        'bg-background fixed inset-x-0 top-(--dock-top) bottom-0 z-40 overflow-hidden',
        'transition-[translate,width] duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
        resizing && 'transition-none',
        // Desktop: a sticky column beside <main> that fills the viewport below the headers.
        'md:sticky md:inset-auto md:top-(--dock-top) md:h-[calc(100svh-var(--dock-top))] md:shrink-0 md:translate-x-0 md:self-start',
        isOpen ? 'translate-x-0 md:w-(--dock-width)' : 'pointer-events-none translate-x-full md:w-0'
      )}>
      <div className="relative flex h-full w-full flex-col border-l md:w-(--dock-width)">
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize assistant panel"
          tabIndex={0}
          {...handleProps}
          className={cn(
            'absolute inset-y-0 left-0 z-20 hidden w-1.5 cursor-col-resize touch-none outline-none md:block',
            'after:bg-primary after:absolute after:inset-y-0 after:left-0 after:w-0.5 after:opacity-0 after:transition-opacity',
            'hover:after:opacity-100 focus-visible:after:opacity-100'
          )}>
          <span
            aria-hidden
            className="bg-border absolute top-1/2 left-0.5 h-10 w-1 -translate-y-1/2 rounded-full"
          />
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          {/* Swallow pointer events over the chat while dragging so iframes/editors don't steal them. */}
          {resizing && <div className="absolute inset-0 z-50" />}
          {hasOpened && (
            <Suspense fallback={<WorkspaceSkeleton />}>
              <AssistantWorkspace userName={user?.spec?.givenName} onClose={close} />
            </Suspense>
          )}
        </div>
      </div>
    </aside>
  );
}
