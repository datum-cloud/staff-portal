import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// Remembers whether the person last left the dock open or closed, so the
// landing page only auto-opens it for people who haven't closed it.
const DOCK_PREF_KEY = 'staff-assistant-dock';

type DockPreference = 'open' | 'closed';

function readPreference(): DockPreference | null {
  try {
    const value = window.localStorage.getItem(DOCK_PREF_KEY);
    return value === 'open' || value === 'closed' ? value : null;
  } catch {
    return null;
  }
}

function writePreference(value: DockPreference) {
  try {
    window.localStorage.setItem(DOCK_PREF_KEY, value);
  } catch {
    // Storage blocked (private mode, policy) — the dock still works, it just
    // won't remember the choice.
  }
}

interface AssistantContextValue {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  /** Open the dock unless the person last closed it. Used by the landing page. */
  openByDefault: () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen((o) => {
      writePreference(o ? 'closed' : 'open');
      return !o;
    });
  }, []);

  const close = useCallback(() => {
    writePreference('closed');
    setIsOpen(false);
  }, []);

  const openByDefault = useCallback(() => {
    if (readPreference() !== 'closed') setIsOpen(true);
  }, []);

  const value = useMemo(
    () => ({ isOpen, toggle, close, openByDefault }),
    [isOpen, toggle, close, openByDefault]
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used within AssistantProvider');
  return ctx;
}

/** Like useAssistant, but null when the assistant is disabled (no provider). */
export function useAssistantOptional() {
  return useContext(AssistantContext);
}
