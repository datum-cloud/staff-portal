import { loadCatalog } from '@/modules/i18n/lingui';
import { linguiServer } from '@/modules/i18n/lingui.server';
import { NonceProvider } from '@/providers/nonce.provider';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { createReadableStreamFromReadable } from '@react-router/node';
import { isbot } from 'isbot';
import { PassThrough } from 'node:stream';
import React from 'react';
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

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: AppLoadContext
  // If you have middleware enabled:
  // loadContext: unstable_RouterContextProvider
) {
  // Ensure requests from bots and SPA Mode renders wait for all content to load before responding
  // https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
  let userAgent = request.headers.get('user-agent');
  return isBot(userAgent) || routerContext.isSpaMode
    ? handleBotRequest(request, responseStatusCode, responseHeaders, routerContext, loadContext)
    : handleBrowserRequest(
        request,
        responseStatusCode,
        responseHeaders,
        routerContext,
        loadContext
      );
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  loadContext: AppLoadContext
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <NonceProvider value={loadContext.cspNonce}>
        <ServerRouter context={reactRouterContext} url={request.url} />
      </NonceProvider>,
      {
        nonce: loadContext.cspNonce,
        onAllReady() {
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
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      }
    );

    setTimeout(abort, streamTimeout + 1000);
  });
}

async function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  loadContext: AppLoadContext
) {
  const locale = await linguiServer.getLocale(request);
  await loadCatalog(locale);

  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <NonceProvider value={loadContext.cspNonce}>
        <I18nProvider i18n={i18n}>
          <ServerRouter context={reactRouterContext} url={request.url} />
        </I18nProvider>
      </NonceProvider>,
      {
        nonce: loadContext.cspNonce,
        onShellReady() {
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
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      }
    );

    setTimeout(abort, streamTimeout + 1000);
  });
}
