/**
 * Shared types for the Operator Assistant chatbot.
 * These are the client-relevant types only.
 * Server-side tool definitions and execution live in app/features/assistant/lib/.
 */

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  /** ISO timestamp when the message was created */
  createdAt: string;
}

/**
 * SSE event types streamed from POST /api/assistant.
 * Each line in the response body is a JSON-serialised AssistantEvent.
 */
export type AssistantEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_start'; tool: string; label: string }
  | { type: 'tool_end'; tool: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

/** Ephemeral indicator shown while a tool call is in flight */
export interface ActiveTool {
  tool: string;
  label: string;
}

export interface AssistantContextValue {
  /** Full conversation history (user + assistant turns) */
  messages: Message[];
  /** True while a streaming response is in progress */
  isStreaming: boolean;
  /** Non-null while a tool call is being executed server-side */
  activeTool: ActiveTool | null;
  /** Whether the drawer is currently open */
  isOpen: boolean;
  /** Open/close the assistant drawer */
  setIsOpen: (open: boolean) => void;
  /** Send a new user message and start streaming */
  sendMessage: (text: string) => void;
  /** Reset conversation history */
  clearConversation: () => void;
}
