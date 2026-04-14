import type { Route } from './+types/root';
import AuthError from '@/components/error/auth';
import GenericError from '@/components/error/generic';
import { ClientHintCheck } from '@/components/misc/client-hints';
import { FaviconLinks } from '@/components/misc/favicon-links';
import type { PublicEnv } from '@/hooks';
import { loadCatalog, useLocale } from '@/modules/i18n/lingui';
import { linguiServer } from '@/modules/i18n/lingui.server';
import MarkerIoEmbed from '@/modules/markerio';
import { queryClient } from '@/modules/tanstack/query';
import { useNonce } from '@/providers/nonce.provider';
import styles from '@/styles/root.css?url';
import { env } from '@/utils/config/env.server';
import { localeCookie } from '@/utils/cookies';
import { RHFAdapter } from '@datum-cloud/datum-ui/form/adapters/rhf';
import { configureProgress, startProgress, stopProgress } from '@datum-cloud/datum-ui/nprogress';
import { ThemeProvider, ThemeScript, useTheme } from '@datum-cloud/datum-ui/theme';
import { Toaster } from '@datum-cloud/datum-ui/toast';
import { i18n } from '@lingui/core';
import * as Sentry from '@sentry/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import clsx from 'clsx';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7';
import { useEffect, useMemo } from 'react';
import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useNavigation,
  useRouteError,
} from 'react-router';

export const links: Route.LinksFunction = () => [{ rel: 'stylesheet', href: styles, as: 'style' }];

export async function loader({ request }: Route.LoaderArgs) {
  const locale = await linguiServer.getLocale(request);
  const cookie = await localeCookie.serialize(locale);

  return data(
    {
      locale,
      ENV: {
        DEBUG: env.isDebug,
        SENTRY_ENV: env.SENTRY_ENV,
        SENTRY_DSN: env.SENTRY_DSN,
        SENTRY_UI_URL: env.sentryUiUrl,
        VERSION: env.VERSION,
        AUTH_OIDC_ISSUER: env.AUTH_OIDC_ISSUER,
        CLOUD_PORTAL_URL: env.CLOUD_PORTAL_URL,
        CHATBOT_ENABLED: env.chatbotEnabled,
        MCP_ENABLED: !!(env.mcpUrl && env.mcpApiKey),
      } satisfies PublicEnv,
    },
    { headers: { 'Set-Cookie': cookie } }
  );
}

function App() {
  const data = useLoaderData<typeof loader>();
  const { resolvedTheme } = useTheme();
  const nonce = useNonce();
  const locale = useLocale();

  const lang = useMemo(() => locale ?? 'en', [locale]);

  useEffect(() => {
    if (i18n.locale !== locale) {
      loadCatalog(locale);
    }
  }, [locale]);

  return (
    <html lang={lang} className={clsx(resolvedTheme)} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <FaviconLinks />
        <ClientHintCheck nonce={nonce} />
        <ThemeScript nonce={nonce} attribute="class" defaultTheme="light" />
        <Meta />
        <Links />
      </head>
      <body className="bg-background overscroll-none font-sans antialiased">
        <Outlet />

        <Toaster
          richColors
          theme={resolvedTheme as 'light' | 'dark'}
          className="toaster group"
          style={
            {
              '--normal-bg': 'var(--popover)',
              '--normal-text': 'var(--popover-foreground)',
              '--normal-border': 'var(--border)',
            } as React.CSSProperties
          }
        />

        <MarkerIoEmbed nonce={nonce} />

        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(data?.ENV)}`,
          }}
        />
      </body>
    </html>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
    </ThemeProvider>
  );
}

export default function AppWithProviders() {
  const navigation = useNavigation();

  useEffect(() => {
    configureProgress();
  }, []);

  useEffect(() => {
    if (navigation.state === 'loading') {
      startProgress();
    } else {
      stopProgress();
    }
  }, [navigation.state]);

  return (
    <QueryClientProvider client={queryClient}>
      <RHFAdapter>
        <NuqsAdapter>
          <App />
        </NuqsAdapter>
      </RHFAdapter>
    </QueryClientProvider>
  );
}

function ErrorLayout({ children }: { children: React.ReactNode }) {
  const nonce = useNonce();
  const { resolvedTheme } = useTheme();

  return (
    <html lang="en" className={clsx(resolvedTheme)} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ThemeScript nonce={nonce} attribute="class" defaultTheme="light" />
        <Meta />
        <Links />
      </head>
      <body className="bg-background overscroll-none font-sans antialiased">
        <div className="flex min-h-screen items-center justify-center">{children}</div>

        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let message = "We've encountered a problem, please try again. Sorry!";
  let requestId: string | undefined;

  if (isRouteErrorResponse(error)) {
    if (error.statusText === 'AUTH_ERROR') {
      return (
        <ErrorLayout>
          <AuthError message={error.data.message} requestId={error.data?.requestId} />
        </ErrorLayout>
      );
    } else if (error?.data?.message) {
      message = error.data.message;
      requestId = error.data.requestId;
    } else {
      message = `${error.status} ${error.statusText}`;
    }
  } else if (error instanceof Error) {
    // you only want to capture non 404-errors that reach the boundary
    Sentry.captureException(error);
    message = error.message;
  }

  return (
    <ErrorLayout>
      <GenericError message={message} requestId={requestId} />
    </ErrorLayout>
  );
}
