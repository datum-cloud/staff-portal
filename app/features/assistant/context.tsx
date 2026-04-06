import { getToolLabel } from '@/features/assistant/lib/tool-labels';
import type { ActiveTool, AssistantContextValue, Message } from '@/features/assistant/types';
import { useChat } from 'ai/react';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const AssistantContext = createContext<AssistantContextValue | undefined>(undefined);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpenState] = useState(false);

  const {
    messages: aiMessages,
    append,
    isLoading,
    stop,
    setMessages,
    error: chatError,
  } = useChat({
    api: '/api/assistant',
    maxSteps: 20,
  });

  const setIsOpen = useCallback((open: boolean | ((prev: boolean) => boolean)) => {
    setIsOpenState(open);
  }, []);

  // Derive activeTool from in-flight tool invocations on the last assistant message
  const activeTool = useMemo<ActiveTool | null>(() => {
    if (!isLoading) return null;
    const lastAssistant = [...aiMessages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant?.toolInvocations) return null;
    const inFlight = lastAssistant.toolInvocations.find((t) => t.state === 'call');
    if (!inFlight) return null;
    return { toolName: inFlight.toolName, label: getToolLabel(inFlight.toolName) };
  }, [aiMessages, isLoading]);

  // Map AI SDK messages to our display Message type
  const messages = useMemo<Message[]>(() => {
    return aiMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m, i, arr) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        isStreaming: isLoading && i === arr.length - 1 && m.role === 'assistant',
      }));
  }, [aiMessages, isLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      await append({ role: 'user', content: text.trim() });
    },
    [append]
  );

  const clearConversation = useCallback(() => {
    stop();
    setMessages([]);
  }, [stop, setMessages]);

  const value: AssistantContextValue = {
    messages,
    isOpen,
    isStreaming: isLoading,
    activeTool,
    error: chatError ? chatError.message : null,
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
