'use client';

import type { AssistantConfig, LinkRenderProps } from './types';
import { createContext, useContext, type ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * Generic link renderer: internal routes use React Router, everything else is
 * an external link. Hosts can wrap this to add their own affordances (e.g.
 * staff prepends a Sentry icon for sentry.io links).
 */
export function defaultRenderLink({ href, children }: LinkRenderProps): ReactNode {
  if (href?.startsWith('/')) {
    return (
      <Link className="underline" to={href}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className="underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/**
 * Neutral fallback so leaf components render without a host having wired a full
 * config. Host apps override via `<AssistantConfigProvider config={…}>`.
 */
export const DEFAULT_ASSISTANT_CONFIG: AssistantConfig = {
  greeting: (name) => `Hey there${name ? `, ${name}` : ''}`,
  suggestions: [],
  showReasoning: true,
  modelSelector: false,
  toolLabels: {},
  renderLink: defaultRenderLink,
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
