import { useAssistant } from '@/features/assistant/context';
import { Button } from '@datum-cloud/datum-ui/button';
import { MessageCircleIcon } from 'lucide-react';
import React, { useCallback, useEffect } from 'react';

/**
 * Icon button in the top header bar that toggles the assistant drawer.
 *
 * Keyboard shortcut: Cmd+J (macOS) / Ctrl+J (Windows/Linux).
 * Uses a functional updater `(prev) => !prev` to avoid stale closure.
 */
export function AssistantTrigger() {
  const { isOpen, setIsOpen } = useAssistant();

  // Stable toggle — functional updater avoids stale closure on isOpen
  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, [setIsOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = /mac/i.test(navigator.platform);
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey && e.key === 'j') {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return (
    <Button
      type="tertiary"
      theme="borderless"
      size="icon"
      onClick={toggle}
      aria-label="Toggle assistant"
      aria-pressed={isOpen}
      className="h-8 w-8"
      title="Assistant (Cmd+J / Ctrl+J)">
      <MessageCircleIcon className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}
