import { ChatInput } from '@/features/assistant/components/chat-input';
import { ChatMessage } from '@/features/assistant/components/chat-message';
import { ToolIndicator } from '@/features/assistant/components/tool-indicator';
import { useAssistant } from '@/features/assistant/context';
import { Button } from '@datum-cloud/datum-ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@datum-cloud/datum-ui/sheet';
import { MessageCircleIcon, RotateCcwIcon } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

/**
 * The main assistant chat drawer.
 *
 * - Slides in from the right at 420px (max 95vw)
 * - Renders the full message list with auto-scroll to bottom
 * - Shows tool indicator while a tool call is in flight
 * - aria-live="polite" on the message list container for screen readers
 */
export function AssistantDrawer() {
  const {
    messages,
    isOpen,
    isStreaming,
    activeTool,
    error,
    setIsOpen,
    sendMessage,
    clearConversation,
  } = useAssistant();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTool]);

  const hasMessages = messages.length > 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        side="right"
        className="flex w-[420px] max-w-[95vw] flex-col gap-0 p-0"
        aria-label="Operator assistant">
        <SheetHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
          <SheetTitle className="text-sm font-semibold">Assistant</SheetTitle>
          {hasMessages && (
            <Button
              type="tertiary"
              theme="borderless"
              size="small"
              onClick={clearConversation}
              disabled={isStreaming}
              aria-label="New conversation"
              className="text-muted-foreground h-7 gap-1.5 text-xs">
              <RotateCcwIcon className="h-3 w-3" aria-hidden="true" />
              New conversation
            </Button>
          )}
        </SheetHeader>

        {/* Message list — aria-live on this container only */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4"
          role="log"
          aria-live="polite"
          aria-label="Conversation">
          {!hasMessages ? (
            <EmptyState />
          ) : (
            <ol className="flex flex-col gap-3" aria-label="Messages">
              {messages.map((message) => (
                <li key={message.id}>
                  <ChatMessage message={message} />
                </li>
              ))}
            </ol>
          )}

          {activeTool && <ToolIndicator activeTool={activeTool} />}

          {error && !isStreaming && (
            <p className="text-destructive mt-2 text-xs" role="alert">
              {error}
            </p>
          )}

          <div ref={messagesEndRef} />
        </div>

        <ChatInput onSend={sendMessage} isStreaming={isStreaming} />
      </SheetContent>
    </Sheet>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
      <MessageCircleIcon
        className="text-muted-foreground h-10 w-10 opacity-40"
        aria-hidden="true"
      />
      <p className="text-muted-foreground max-w-[220px] text-sm">
        Ask a question about platform data — users, organizations, fraud evaluations, and more.
      </p>
    </div>
  );
}
