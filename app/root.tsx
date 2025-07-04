import type { Route } from './+types/root';
import AuthError from '@/components/error/auth';
import GenericError from '@/components/error/generic';
import { ClientHintCheck } from '@/components/misc/client-hints';
import { loadCatalog, useLocale } from '@/modules/i18n/lingui';
import { linguiServer } from '@/modules/i18n/lingui.server';
import { configureProgress, startProgress, stopProgress } from '@/modules/nprogress';
import { queryClient } from '@/modules/tanstack/query';
import { useNonce } from '@/providers/nonce.provider';
import styles from '@/styles/root.css?url';
import { env } from '@/utils/config/env.server';
import { localeCookie, themeSessionResolver } from '@/utils/cookies';
import { i18n } from '@lingui/core';
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
  useRouteLoaderData,
} from 'react-router';
import { PreventFlashOnWrongTheme, Theme, ThemeProvider, useTheme } from 'remix-themes';

export const links: Route.LinksFunction = () => [{ rel: 'stylesheet', href: styles, as: 'style' }];

export async function loader({ request }: Route.LoaderArgs) {
  const locale = await linguiServer.getLocale(request);
  const cookie = await localeCookie.serialize(locale);
  const { getTheme } = await themeSessionResolver(request);

  return data(
    {
      locale,
      theme: getTheme(),
      ENV: {
        DEBUG: env.isDebug,
      },
    },
    { headers: { 'Set-Cookie': cookie } }
  );
}

function App() {
  const data = useLoaderData<typeof loader>();
  const [theme] = useTheme();
  const nonce = useNonce();
  const locale = useLocale();

  const lang = useMemo(() => locale ?? 'en', [locale]);

  useEffect(() => {
    if (i18n.locale !== locale) {
      loadCatalog(locale);
    }
  }, [locale]);

  return (
    <html lang={lang} className={clsx(theme)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ClientHintCheck nonce={nonce} />
        <Meta />
        <PreventFlashOnWrongTheme ssrTheme={Boolean(data?.theme)} />
        <Links />
      </head>
      <body className="bg-background theme-alpha overscroll-none font-sans antialiased">
        <Outlet />
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
  const data = useRouteLoaderData<typeof loader>('root');

  return (
    <ThemeProvider specifiedTheme={data?.theme ?? Theme.LIGHT} themeAction="/action/set-theme">
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
      <NuqsAdapter>
        <App />
      </NuqsAdapter>
    </QueryClientProvider>
  );
}

function ErrorLayout({ children }: { children: React.ReactNode }) {
  const nonce = useNonce();
  const [theme] = useTheme();

  return (
    <html lang="en" className={clsx(theme)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-background theme-alpha overscroll-none font-sans antialiased">
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

  if (isRouteErrorResponse(error)) {
    if (error.statusText === 'AUTH_ERROR') {
      return (
        <ErrorLayout>
          <AuthError message={error.data.message} />
        </ErrorLayout>
      );
    } else {
      message = `${error.status} ${error.statusText}`;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <ErrorLayout>
      <GenericError message={message} />
    </ErrorLayout>
  );
}
