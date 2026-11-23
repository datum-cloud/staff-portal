import { httpClient } from '@/modules/axios/axios.client';
import { loadCatalog } from '@/modules/i18n/lingui';
import { createBeforeSend } from '@/modules/sentry';
import { NonceProvider } from '@/providers/nonce.provider';
import { logger } from '@/utils/logger';
import { i18n } from '@lingui/core';
import { detect, fromHtmlTag } from '@lingui/detect-locale';
import { I18nProvider } from '@lingui/react';
import { client } from '@openapi/shared/client.gen';
import * as Sentry from '@sentry/react-router';
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';

const env = (window as any).ENV;

Sentry.init({
  dsn: env?.SENTRY_DSN,

  // Environment configuration
  environment: env?.SENTRY_ENV || 'development',

  // Never attach request or response bodies to events.
  dataCollection: { httpBodies: [] },

  integrations: [
    // Performance
    Sentry.reactRouterTracingIntegration(),
    // Session replay
    Sentry.replayIntegration(),
    // User feedback - disabled to remove "Report a Bug" button
    // Sentry.feedbackIntegration({
    //   // Additional SDK configuration goes in here, for example:
    //   colorScheme: 'system',
    // }),
  ],

  // Shared reporting policy: drop handled/noise events, scrub secrets, group
  // API errors. Same handler runs on the server (observability/providers/sentry).
  beforeSend: createBeforeSend(),

  tracesSampleRate: env?.NODE_ENV === 'production' ? 0.1 : 1.0, // Capture transactions

  // Set `tracePropagationTargets` to declare which URL(s) should have trace propagation enabled
  tracePropagationTargets: [/^\//, new RegExp(window.location.origin)],

  // Capture Replay for 10% of all sessions,
  // plus 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Release name
  release: env?.VERSION || 'dev',
});

// Configure default client for client-side (goes through /api/internal proxy)
client.setConfig({
  axios: httpClient,
});

/**
 * The CSP nonce the server rendered into this page. Browsers hide the `nonce`
 * attribute from the DOM once the page loads, but keep the value on the
 * element's `nonce` property. Hydrating with the same value the server used
 * keeps the `<head>` scripts from mismatching (#875). The CSP itself is
 * unchanged: the browser still enforces the nonce from the response header.
 */
function readCspNonce(): string {
  return document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce ?? '';
}

async function main() {
  const locale = detect(fromHtmlTag('lang')) || 'en';
  await loadCatalog(locale);
  const cspNonce = readCspNonce();

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <NonceProvider value={cspNonce}>
          <I18nProvider i18n={i18n}>
            <HydratedRouter />
          </I18nProvider>
        </NonceProvider>
      </StrictMode>
    );
  });
}

main().catch((error) => {
  logger.error('Client hydration error', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
});
