import { Button } from '@datum-cloud/datum-ui/button';
import { ArrowUpIcon } from 'lucide-react';
import React, { useCallback, useRef } from 'react';

interface ChatInputProps {
  onSend: (text: string) => void;
  isStreaming: boolean;
}

/**
 * Textarea + send button for the chat interface.
 *
 * - Enter submits (Shift+Enter inserts a newline)
 * - Disabled while isStreaming is true
 * - Auto-resizes up to a max height
 */
export function ChatInput({ onSend, isStreaming }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const value = textareaRef.current?.value.trim();
    if (!value || isStreaming) return;
    onSend(value);
    if (textareaRef.current) {
      textareaRef.current.value = '';
      // Reset height after clearing
      textareaRef.current.style.height = 'auto';
    }
  }, [onSend, isStreaming]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  return (
    <div className="bg-background flex items-end gap-2 border-t px-3 py-3">
      <textarea
        ref={textareaRef}
        rows={1}
        placeholder="Ask a question..."
        disabled={isStreaming}
        onKeyDown={handleKeyDown}
        onChange={handleInput}
        aria-label="Message input"
        className="bg-background placeholder:text-muted-foreground focus:ring-ring flex-1 resize-none rounded-lg border px-3 py-2 text-sm ring-0 outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ minHeight: '40px', maxHeight: '160px' }}
      />
      <Button
        type="primary"
        size="icon"
        onClick={handleSubmit}
        disabled={isStreaming}
        aria-label="Send message"
        className="h-9 w-9 shrink-0">
        <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
