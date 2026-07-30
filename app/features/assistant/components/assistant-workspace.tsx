'use client';

import { useChatLogic } from '../hooks';
import { useAssistantModels } from '../hooks/use-assistant-models';
import { deriveTitle } from '../lib';
import { buildStaffAssistantConfig } from '../staff-config';
import {
  AssistantWorkspace as SharedAssistantWorkspace,
  type AssistantConfig,
} from '@datum-cloud/datum-ui/assistant';
import { useMemo } from 'react';

interface AssistantWorkspaceProps {
  /** Host-specific configuration (copy, suggestions, tool labels, models, …). */
  config?: Partial<AssistantConfig>;
  /** Display name for the greeting; the host reads it from its own user context. */
  userName?: string;
}

/**
 * Staff-portal's host wrapper around the shared, props-driven
 * `@datum-cloud/datum-ui/assistant` workspace. This owns state + transport (the
 * `useChatLogic` hook, localStorage persistence, tiptap editor, speech input)
 * and feeds it into the presentational layer. cloud-portal writes its own
 * equivalent wrapper.
 */
export function AssistantWorkspace({ config, userName }: AssistantWorkspaceProps) {
  const { models } = useAssistantModels();
  const staffConfig = useMemo(() => buildStaffAssistantConfig(models), [models]);
  const mergedConfig = useMemo((): Partial<AssistantConfig> => {
    if (config?.modelSelector === false) {
      return { ...staffConfig, ...config, modelSelector: false };
    }
    if (staffConfig.modelSelector === false) {
      return { ...staffConfig, ...config, modelSelector: false };
    }
    return {
      ...staffConfig,
      ...config,
      modelSelector: {
        ...staffConfig.modelSelector,
        ...(typeof config?.modelSelector === 'object' ? config.modelSelector : {}),
        models,
      },
    };
  }, [staffConfig, config, models]);

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
  } = useChatLogic(models);

  const hasMessages = messages.length > 0;
  const currentChat = chatList.find((c) => c.id === currentChatId);
  const title = currentChat?.title ?? (hasMessages ? deriveTitle(messages) : 'New chat');

  return (
    <SharedAssistantWorkspace
      config={mergedConfig}
      userName={userName}
      title={title}
      messages={messages}
      status={status}
      error={error}
      isReady={isReady}
      chatList={chatList}
      currentChatId={currentChatId}
      editor={editor}
      htmlByUserMsgIndex={htmlByUserMsgIndex}
      bottomRef={bottomRef}
      containerRef={messagesContainerRef}
      userScrolledUpRef={userScrolledUp}
      onSend={handleSendClick}
      onStop={stop}
      onRetry={handleRetry}
      onNewChat={startNewChat}
      // The shared list is typed as ChatSummary; re-resolve the full StoredChat
      // (with model/effort/userHtml) from our own list before loading.
      onLoadChat={(chat) => {
        const full = chatList.find((c) => c.id === chat.id);
        if (full) loadChat(full);
      }}
      onDeleteChat={handleDeleteChat}
      onSuggestion={sendSuggestion}
      modelId={modelId}
      effortId={effortId}
      onModelChange={setModelId}
      onEffortChange={setEffortId}
      micSupported={speech.isSupported}
      micListening={speech.isListening}
      micFrequencyData={speech.frequencyData}
      onMicToggle={speech.isListening ? speech.stopListening : speech.startListening}
      historyOpen={historyOpen}
      onToggleHistory={() => setHistoryOpen((o) => !o)}
    />
  );
}
