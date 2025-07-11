import { loadCatalog } from '@/modules/i18n/lingui';
import { linguiServer } from '@/modules/i18n/lingui.server';
import { NonceProvider } from '@/providers/nonce.provider';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { createReadableStreamFromReadable } from '@react-router/node';
import { isbot } from 'isbot';
import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import type { AppLoadContext, EntryContext } from 'react-router';
import { ServerRouter } from 'react-router';

export const streamTimeout = 5_000;

function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;

  // Skip bot detection for Cypress tests
  if (/Cypress|axios/.test(userAgent)) return false;

  return isbot(userAgent);
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: AppLoadContext
) {
  let userAgent = request.headers.get('user-agent');
  const requestId = loadContext.requestId;
  const callbackName = isBot(userAgent) || routerContext.isSpaMode ? 'onAllReady' : 'onShellReady';

  const locale = await linguiServer.getLocale(request);
  await loadCatalog(locale);

  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <NonceProvider value={loadContext.cspNonce}>
        <I18nProvider i18n={i18n}>
          <ServerRouter nonce={loadContext.cspNonce} context={routerContext} url={request.url} />
        </I18nProvider>
      </NonceProvider>,
      {
        nonce: loadContext.cspNonce,
        [callbackName]() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          console.error(`❌ [${requestId}] Shell rendering error:`, error);

          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;

          console.error(`❌ [${requestId}] React rendering error (500):`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            url: request.url,
            userAgent: userAgent,
          });

          if (shellRendered) {
            console.error(`❌ [${requestId}] Error after shell rendered:`, error);
          }
        },
      }
    );

    setTimeout(abort, streamTimeout + 1000);
  });
}
