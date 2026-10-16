import { useCallback, useRef, useState, useSyncExternalStore } from 'react';

// Mirrors cloud-portal's project dock (app/features/project-dock/use-dock-width.ts)
// so the two portals' assistant docks size and resize the same way.
const STORAGE_KEY = 'staff-assistant-dock-width';
const CHANGE_EVENT = 'staff-assistant-dock-width';
const DEFAULT_WIDTH = 512;
const MIN_WIDTH = 320;
/** Always leave at least this much room for the page content. */
const MIN_CONTENT_WIDTH = 480;
const KEYBOARD_STEP = 32;

function maxWidth() {
  return Math.max(MIN_WIDTH, window.innerWidth - MIN_CONTENT_WIDTH);
}

function clamp(width: number) {
  return Math.min(maxWidth(), Math.max(MIN_WIDTH, width));
}

function readStoredWidth() {
  try {
    return clamp(Number(window.localStorage.getItem(STORAGE_KEY)) || DEFAULT_WIDTH);
  } catch {
    return clamp(DEFAULT_WIDTH);
  }
}

function persist(width: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Math.round(width)));
  } catch {
    // Storage blocked — width just resets next visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Re-read on window resize (to re-clamp) and whenever this hook persists a width.
function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('resize', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * Resizable dock width: drag the left edge (pointer), ArrowLeft/ArrowRight to
 * step, Home/End for min/max, double-click to reset. Persisted per browser.
 */
export function useDockWidth() {
  // The server render has no window/localStorage, so it uses the default.
  const storedWidth = useSyncExternalStore(subscribe, readStoredWidth, () => DEFAULT_WIDTH);
  // Live width while dragging; committed to storage on release.
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);
  const width = dragWidth ?? storedWidth;

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { startX: e.clientX, startWidth: width };
      setDragWidth(width);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width]
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    // The handle sits on the dock's left edge: dragging left widens it.
    setDragWidth(clamp(drag.current.startWidth + (drag.current.startX - e.clientX)));
  }, []);

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!drag.current) return;
      drag.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (dragWidth != null) persist(dragWidth);
      setDragWidth(null);
    },
    [dragWidth]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === 'ArrowLeft') persist(clamp(width + KEYBOARD_STEP));
      else if (e.key === 'ArrowRight') persist(clamp(width - KEYBOARD_STEP));
      else if (e.key === 'Home') persist(MIN_WIDTH);
      else if (e.key === 'End') persist(maxWidth());
      else return;
      e.preventDefault();
    },
    [width]
  );

  const onDoubleClick = useCallback(() => persist(clamp(DEFAULT_WIDTH)), []);

  return {
    width,
    resizing: dragWidth != null,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onKeyDown,
      onDoubleClick,
      'aria-valuemin': MIN_WIDTH,
      'aria-valuenow': width,
    },
  };
}
