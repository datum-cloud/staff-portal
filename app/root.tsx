import type { Route } from './+types/root';
import { ClientHintCheck } from '@/components/misc/client-hints';
import { loadCatalog, useLocale } from '@/modules/i18n/lingui';
import { linguiServer, localeCookie } from '@/modules/i18n/lingui.server';
import { useNonce } from '@/providers/nonce.provider';
import styles from '@/styles/root.css?url';
import { i18n } from '@lingui/core';
import React, { useEffect, useMemo } from 'react';
import { data, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';

export const links: Route.LinksFunction = () => [{ rel: 'stylesheet', href: styles }];

export async function loader({ request }: Route.LoaderArgs) {
  const locale = await linguiServer.getLocale(request);
  const cookie = await localeCookie.serialize(locale);

  return data({ locale }, { headers: { 'Set-Cookie': cookie } });
}

export function Layout({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const nonce = useNonce();

  useEffect(() => {
    if (i18n.locale !== locale) {
      loadCatalog(locale);
    }
  }, [locale]);

  const lang = useMemo(() => locale ?? 'en', [locale]);

  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ClientHintCheck nonce={nonce} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
