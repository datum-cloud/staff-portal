'use client';

import type { AssistantConfig } from './types';
import { Brain } from 'lucide-react';
import { createContext, useContext, type ReactNode } from 'react';

/**
 * Neutral fallback so leaf components render without a host having wired a full
 * config. Host apps override via `<AssistantConfigProvider config={…}>`.
 */
export const DEFAULT_ASSISTANT_CONFIG: AssistantConfig = {
  greeting: (name) => `Hey there${name ? `, ${name}` : ''}`,
  greetingIcon: Brain,
  suggestions: [],
  showReasoning: true,
  modelSelector: false,
  toolLabels: {},
};

const AssistantConfigContext = createContext<AssistantConfig>(DEFAULT_ASSISTANT_CONFIG);

export function AssistantConfigProvider({
  config,
  children,
}: {
  config?: Partial<AssistantConfig>;
  children: ReactNode;
}) {
  const value = config ? { ...DEFAULT_ASSISTANT_CONFIG, ...config } : DEFAULT_ASSISTANT_CONFIG;
  return (
    <AssistantConfigContext.Provider value={value}>{children}</AssistantConfigContext.Provider>
  );
}

export function useAssistantConfig(): AssistantConfig {
  return useContext(AssistantConfigContext);
}
