import { MarkdownRenderer } from '@/features/assistant/components/markdown-renderer';
import type { Message } from '@/features/assistant/types';
import React from 'react';

interface ChatMessageProps {
  message: Message;
}

/**
 * Renders a single chat message bubble.
 *
 * - User messages: right-aligned with accent background
 * - Assistant messages: left-aligned with muted background, Markdown rendered
 * - Streaming assistant messages show a blinking cursor after the content
 * - Empty streaming messages show three typing dots
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-tr-sm px-3.5 py-2 text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start">
      <div className="bg-muted text-foreground max-w-[95%] rounded-2xl rounded-tl-sm px-3.5 py-2 text-sm">
        {message.isStreaming && message.content === '' ? (
          // Typing dots indicator for the very start of streaming
          <div className="flex items-center gap-1 py-1" aria-label="Assistant is typing">
            <span className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
            <span className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
            <span className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
          </div>
        ) : (
          <>
            <MarkdownRenderer content={message.content} />
            {message.isStreaming && (
              <span
                className="bg-foreground ml-0.5 inline-block h-3.5 w-0.5 animate-pulse align-text-bottom"
                aria-hidden="true"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
