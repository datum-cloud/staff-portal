'use client';

import { AssistantConfigProvider } from '../assistant-config';
import { useChatLogic } from '../hooks';
import { deriveTitle } from '../lib';
import type { AssistantConfig } from '../types';
import { PromptCard } from './composer';
import { Conversation } from './conversation';
import { EmptyState } from './empty-state';
import { ChatRail, HistoryPanel } from './sidebar';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { MessageSquarePlus, PanelLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface AssistantWorkspaceProps {
  /** Host-specific configuration (copy, suggestions, tool labels, models, …). */
  config?: Partial<AssistantConfig>;
  /** Display name for the greeting; the host reads it from its own user context. */
  userName?: string;
}

export function AssistantWorkspace({ config, userName }: AssistantWorkspaceProps) {
  const {
    messages,
    status,
    error,
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
    stop,
    historyOpen,
    setHistoryOpen,
    speech,
    modelId,
    setModelId,
    effortId,
    setEffortId,
  } = useChatLogic();

  const hasMessages = messages.length > 0;
  const currentChat = chatList.find((c) => c.id === currentChatId);
  const title = currentChat?.title ?? (hasMessages ? deriveTitle(messages) : 'New chat');

  const promptCard = (
    <PromptCard
      editor={editor}
      isReady={isReady}
      canRetry={isReady && messages.some((m) => m.role === 'user')}
      onSend={handleSendClick}
      onStop={stop}
      onRetry={handleRetry}
      modelId={modelId}
      effortId={effortId}
      onModelChange={setModelId}
      onEffortChange={setEffortId}
      speechSupported={speech.isSupported}
      isListening={speech.isListening}
      frequencyData={speech.frequencyData}
      onMicToggle={speech.isListening ? speech.stopListening : speech.startListening}
    />
  );

  return (
    <AssistantConfigProvider config={config}>
      <div className="bg-background flex h-full w-full overflow-hidden">
        <ChatRail
          historyOpen={historyOpen}
          onNewChat={startNewChat}
          onToggleHistory={() => setHistoryOpen((o) => !o)}
        />

        <AnimatePresence initial={false}>
          {historyOpen && (
            <motion.div
              className="h-full shrink-0 overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: 256 }}
              exit={{ width: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}>
              <HistoryPanel
                chatList={chatList}
                currentChatId={currentChatId}
                onLoadChat={loadChat}
                onDeleteChat={handleDeleteChat}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex min-w-0 flex-1 flex-col">
          {hasMessages ? (
            <>
              <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
                <span className="text-foreground min-w-0 truncate text-sm font-medium">
                  {title}
                </span>
                <div className="flex items-center gap-1">
                  <Tooltip message="New chat" side="bottom">
                    <button
                      type="button"
                      aria-label="New chat"
                      onClick={startNewChat}
                      className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-md p-1.5 transition-colors">
                      <MessageSquarePlus className="size-4" />
                    </button>
                  </Tooltip>
                  <Tooltip message={historyOpen ? 'Close sidebar' : 'Open sidebar'} side="bottom">
                    <button
                      type="button"
                      aria-label="Toggle sidebar"
                      onClick={() => setHistoryOpen((o) => !o)}
                      className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-md p-1.5 transition-colors">
                      <PanelLeft className="size-4" />
                    </button>
                  </Tooltip>
                </div>
              </header>

              <Conversation
                messages={messages}
                status={status}
                error={error}
                htmlByUserMsgIndex={htmlByUserMsgIndex}
                containerRef={messagesContainerRef}
                bottomRef={bottomRef}
                userScrolledUpRef={userScrolledUp}
                footer={promptCard}
              />
            </>
          ) : (
            <EmptyState name={userName} isReady={isReady} onSuggestion={sendSuggestion}>
              {promptCard}
            </EmptyState>
          )}
        </div>
      </div>
    </AssistantConfigProvider>
  );
}
