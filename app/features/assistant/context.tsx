import { createAssistantStream } from '@/features/assistant/hooks/use-assistant-stream';
import type { ActiveTool, AssistantContextValue, Message } from '@/features/assistant/types';
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const MAX_MESSAGES = 50;

const AssistantContext = createContext<AssistantContextValue | undefined>(undefined);

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOpen, setIsOpenState] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref mirror of messages so sendMessage can read the latest snapshot
  // synchronously without adding messages to its dependency array.
  const messagesRef = useRef<Message[]>(messages);
  const abortRef = useRef<AbortController | null>(null);

  // Sync ref whenever messages state updates
  const updateMessages = useCallback((updater: (prev: Message[]) => Message[]) => {
    setMessages((prev) => {
      const next = updater(prev);
      messagesRef.current = next;
      return next;
    });
  }, []);

  const setIsOpen = useCallback((open: boolean | ((prev: boolean) => boolean)) => {
    setIsOpenState(open);
  }, []);

  const clearConversation = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    updateMessages(() => []);
    setIsStreaming(false);
    setActiveTool(null);
    setError(null);
  }, [updateMessages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setError(null);

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: text.trim(),
      };

      const assistantPlaceholder: Message = {
        id: generateId(),
        role: 'assistant',
        content: '',
        isStreaming: true,
      };

      // Capture current history + new user message for the API payload
      // (before the placeholder is added, so we only send real messages)
      const payloadBase = messagesRef.current.filter((m) => !m.isStreaming);
      const payloadMessages: Message[] = [...payloadBase, userMessage];

      // Update UI: add user message + empty assistant placeholder, cap at 50
      updateMessages((prev) => {
        const updated = [...prev, userMessage, assistantPlaceholder];
        return updated.length > MAX_MESSAGES
          ? updated.slice(updated.length - MAX_MESSAGES)
          : updated;
      });

      setIsStreaming(true);
      setActiveTool(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await createAssistantStream(
          payloadMessages,
          (event) => {
            switch (event.type) {
              case 'text_delta':
                updateMessages((prev) =>
                  prev.map((m) => (m.isStreaming ? { ...m, content: m.content + event.text } : m))
                );
                break;
              case 'tool_start':
                setActiveTool({ toolName: event.toolName, label: event.label });
                break;
              case 'tool_end':
                setActiveTool((current) => (current?.toolName === event.toolName ? null : current));
                break;
              case 'message_stop':
                updateMessages((prev) =>
                  prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
                );
                setIsStreaming(false);
                setActiveTool(null);
                break;
              case 'error':
                setError(event.message);
                updateMessages((prev) =>
                  prev.map((m) =>
                    m.isStreaming
                      ? {
                          ...m,
                          isStreaming: false,
                          content: m.content || `Error: ${event.message}`,
                        }
                      : m
                  )
                );
                setIsStreaming(false);
                setActiveTool(null);
                break;
            }
          },
          controller.signal
        );
      } catch (err: unknown) {
        const isAbort =
          err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError');

        if (!isAbort) {
          const message = err instanceof Error ? err.message : 'An unexpected error occurred';
          setError(message);
          updateMessages((prev) =>
            prev.map((m) =>
              m.isStreaming
                ? { ...m, isStreaming: false, content: m.content || `Error: ${message}` }
                : m
            )
          );
        } else {
          // Aborted — finalise any partial streamed content
          updateMessages((prev) =>
            prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
          );
        }
        setIsStreaming(false);
        setActiveTool(null);
      }
    },
    [updateMessages]
  );

  const value: AssistantContextValue = {
    messages,
    isOpen,
    isStreaming,
    activeTool,
    error,
    setIsOpen,
    sendMessage,
    clearConversation,
  };

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant(): AssistantContextValue {
  const context = useContext(AssistantContext);
  if (context === undefined) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
}
