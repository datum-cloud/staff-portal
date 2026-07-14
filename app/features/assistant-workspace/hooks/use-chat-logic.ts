/* eslint-disable react-hooks/refs, react-hooks/purity, react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization --
 * Chat logic intentionally mirrors state into refs to avoid stale closures
 * inside the AI SDK's onFinish handler (captured once per stream).
 * `currentChatIdRef` and `onFinishRef` mirror state, `useRef(Date.now())`
 * captures session start time, and the one-time `setChatList(listChats())`
 * effect bootstraps the chat history from localStorage. `refreshChatList` /
 * `handleDeleteChat` keep explicit `useCallback` deps (the stable `setChatList`
 * setter is intentionally omitted) which the React Compiler can't preserve.
 */
import {
  DEFAULT_EFFORT_ID,
  DEFAULT_MODEL_ID,
  MODEL_OPTIONS,
  MODEL_SELECTOR_ENABLED,
} from '../constants';
import { deleteChat, deriveTitle, listChats, sanitizeUserHtml, saveChat } from '../lib';
import type { EffortId, StoredChat } from '../types';
import { useSpeechInput } from './use-speech-input';
import { useEnv } from '@/hooks';
import { useChat } from '@ai-sdk/react';
import { cn } from '@datum-cloud/datum-ui/utils';
import Placeholder from '@tiptap/extension-placeholder';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { DefaultChatTransport } from 'ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function detectOs(): 'macos' | 'windows' | 'linux' | 'unknown' {
  const ua = navigator.userAgent;
  if (/Mac/i.test(ua)) return 'macos';
  if (/Win/i.test(ua)) return 'windows';
  if (/Linux/i.test(ua)) return 'linux';
  return 'unknown';
}

export function useChatLogic() {
  const bottomRef = useRef<HTMLDivElement>(null);

  const [currentChatId, setCurrentChatId] = useState<string>(() => crypto.randomUUID());
  const currentChatIdRef = useRef(currentChatId);
  currentChatIdRef.current = currentChatId;

  const chatCreatedAtRef = useRef(Date.now());
  const [chatList, setChatList] = useState<StoredChat[]>([]);

  // Selected model + effort (the prompt card's "Sonnet 4.6 · High" control).
  // Mirrored into refs so the memoized transport reads the latest value. The
  // initial model honors the ANTHROPIC_MODEL env when it matches an option.
  const env = useEnv();
  const [modelId, setModelId] = useState<string>(() =>
    env?.ANTHROPIC_MODEL && MODEL_OPTIONS.some((m) => m.id === env.ANTHROPIC_MODEL)
      ? env.ANTHROPIC_MODEL
      : DEFAULT_MODEL_ID
  );
  const [effortId, setEffortId] = useState<EffortId>(DEFAULT_EFFORT_ID);
  const modelIdRef = useRef(modelId);
  modelIdRef.current = modelId;
  const effortIdRef = useRef(effortId);
  effortIdRef.current = effortId;

  useEffect(() => {
    setChatList(listChats());
  }, []);

  const refreshChatList = useCallback(() => {
    setChatList(listChats());
  }, []);

  const userScrolledUp = useRef(false);
  const scrollRaf = useRef(0);

  const messagesContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new MutationObserver(() => {
      if (userScrolledUp.current) return;
      cancelAnimationFrame(scrollRaf.current);
      scrollRaf.current = requestAnimationFrame(() => {
        node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
      });
    });
    observer.observe(node, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(scrollRaf.current);
    };
  }, []);

  const htmlByUserMsgIndex = useRef<string[]>([]);

  const onFinishRef = useRef<(messages: ReturnType<typeof listChats>[number]['messages']) => void>(
    () => {}
  );
  onFinishRef.current = (finishedMessages) => {
    const toSave = finishedMessages.filter((m) => m.role !== 'system');
    if (toSave.length === 0) return;
    saveChat({
      id: currentChatIdRef.current,
      title: deriveTitle(toSave),
      messages: toSave,
      userHtml: [...htmlByUserMsgIndex.current],
      model: modelIdRef.current,
      effort: effortIdRef.current,
      createdAt: chatCreatedAtRef.current,
      updatedAt: Date.now(),
    });
    refreshChatList();
  };

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/assistant',
        prepareSendMessagesRequest: ({ messages, id, body }) => ({
          body: {
            id,
            messages: messages.filter((m) => m.role !== 'system'),
            // Only send an override when the selector is exposed; otherwise the
            // server uses its default model/effort.
            ...(MODEL_SELECTOR_ENABLED
              ? { model: modelIdRef.current, effort: effortIdRef.current }
              : {}),
            ...body,
            clientOs: detectOs(),
          },
        }),
      }),
    []
  );

  const { messages, setMessages, sendMessage, stop, status, error, clearError } = useChat({
    transport,
    onFinish: ({ messages: finished }) => onFinishRef.current(finished),
  });
  const isReady = status === 'ready' || status === 'error';

  const startNewChat = useCallback(() => {
    const id = crypto.randomUUID();
    setCurrentChatId(id);
    chatCreatedAtRef.current = Date.now();
    htmlByUserMsgIndex.current = [];
    setMessages([]);
    clearError();
  }, [setMessages, clearError]);

  const loadChat = useCallback(
    (chat: StoredChat) => {
      setCurrentChatId(chat.id);
      chatCreatedAtRef.current = chat.createdAt;
      if (chat.model) setModelId(chat.model);
      if (chat.effort) setEffortId(chat.effort);
      htmlByUserMsgIndex.current = chat.userHtml
        ? chat.userHtml.map(sanitizeUserHtml)
        : chat.messages
            .filter((m) => m.role === 'user')
            .map((m) => {
              const text = m.parts.find((p) => p.type === 'text')?.text ?? '';
              return sanitizeUserHtml(text);
            });
      setMessages(chat.messages);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 50);
    },
    [setMessages]
  );

  const handleDeleteChat = useCallback(
    (e: React.MouseEvent, chatId: string) => {
      e.stopPropagation();
      deleteChat(chatId);
      setChatList(listChats());
      if (chatId === currentChatId) startNewChat();
    },
    [currentChatId, startNewChat]
  );

  const editor = useEditor({
    // This route renders on the server (unlike the lazy-loaded slide-up), so
    // tiptap must not render immediately or SSR/client markup will mismatch.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        horizontalRule: false,
      }),
      Placeholder.configure({ placeholder: 'What are you trying to do today?' }),
    ],
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none',
          'px-1 py-1 text-sm focus:outline-none',
          '[&_p]:my-0.5'
        ),
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          const text = view.state.doc.textContent.trim();
          if (text && isReady) {
            clearError();
            htmlByUserMsgIndex.current.push(editor?.getHTML() ?? `<p>${text}</p>`);
            void sendMessage({ text });
            const { state } = view;
            view.dispatch(
              state.tr.replaceWith(0, state.doc.content.size, state.schema.nodes.paragraph.create())
            );
          }
          return true;
        }
        return false;
      },
    },
  });

  const speech = useSpeechInput(editor);

  const handleSendClick = () => {
    if (!editor || !isReady) return;
    const text = editor.getText().trim();
    if (text) {
      clearError();
      htmlByUserMsgIndex.current.push(editor.getHTML());
      void sendMessage({ text });
      editor.commands.clearContent();
      editor.commands.focus();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const sendSuggestion = useCallback(
    (suggestion: string) => {
      if (!isReady) return;
      clearError();
      htmlByUserMsgIndex.current.push(`<p>${suggestion}</p>`);
      void sendMessage({ text: suggestion });
    },
    [isReady, clearError, sendMessage]
  );

  const handleRetry = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    const text = lastUserMsg.parts.find((p) => p.type === 'text')?.text;
    if (!text) return;

    const lastUserIdx = messages.lastIndexOf(lastUserMsg);
    const retainedHtml = htmlByUserMsgIndex.current.slice(0, -1);

    setMessages(messages.slice(0, lastUserIdx));
    htmlByUserMsgIndex.current = retainedHtml;
    clearError();

    requestAnimationFrame(() => {
      htmlByUserMsgIndex.current.push(retainedHtml[retainedHtml.length] ?? `<p>${text}</p>`);
      void sendMessage({ text });
    });
  }, [messages, setMessages, clearError, sendMessage]);

  const [historyOpen, setHistoryOpen] = useState(false);

  return {
    messages,
    status,
    error,
    clearError,
    sendMessage,
    stop,
    isReady,
    currentChatId,
    chatList,
    startNewChat,
    loadChat,
    handleDeleteChat,
    htmlByUserMsgIndex,
    bottomRef,
    messagesContainerRef,
    userScrolledUp,
    editor,
    handleSendClick,
    sendSuggestion,
    handleRetry,
    historyOpen,
    setHistoryOpen,
    speech,
    modelId,
    setModelId,
    effortId,
    setEffortId,
  };
}
