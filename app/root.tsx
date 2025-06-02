import type { Route } from './+types/root';
import { ClientHintCheck } from '@/components/misc/client-hints';
import { loadCatalog, useLocale } from '@/modules/i18n/lingui';
import { linguiServer } from '@/modules/i18n/lingui.server';
import { AppProvider } from '@/providers/app.provider';
import { useNonce } from '@/providers/nonce.provider';
import { authUserQuery } from '@/resources/api/auth.resource';
import styles from '@/styles/root.css?url';
import { localeCookie, sessionCookie, themeSessionResolver } from '@/utils/cookies';
import { i18n } from '@lingui/core';
import clsx from 'clsx';
import { useEffect, useMemo } from 'react';
import { data, Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from 'react-router';
import { PreventFlashOnWrongTheme, ThemeProvider, useTheme } from 'remix-themes';

export const links: Route.LinksFunction = () => [{ rel: 'stylesheet', href: styles, as: 'style' }];

export async function loader({ request }: Route.LoaderArgs) {
  const locale = await linguiServer.getLocale(request);
  const cookie = await localeCookie.serialize(locale);
  const { getTheme } = await themeSessionResolver(request);

  // Get user from session
  const session = await sessionCookie.get(request);
  const user = await authUserQuery(session?.data?.accessToken ?? '');

  return data({ locale, theme: getTheme(), user }, { headers: { 'Set-Cookie': cookie } });
}

export default function AppWithProviders() {
  const data = useLoaderData<typeof loader>();

  return (
    <AppProvider user={data.user}>
      <ThemeProvider specifiedTheme={data.theme} themeAction="/action/set-theme">
        <App />
      </ThemeProvider>
    </AppProvider>
  );
}

export function App() {
  const data = useLoaderData<typeof loader>();

  const locale = useLocale();
  const nonce = useNonce();
  const [theme] = useTheme();
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
        <PreventFlashOnWrongTheme ssrTheme={Boolean(data.theme)} />
        <Links />
      </head>
      <body className="bg-background theme-alpha overscroll-none font-sans antialiased">
        <Outlet />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  let message = "We've encountered a problem, please try again. Sorry!";

  // Handle standard JavaScript errors
  if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="error-container">
      <h1>Something went wrong</h1>
      <p>{message}</p>
    </div>
  );
}
