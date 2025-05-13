import type { Route } from './+types/root';
import { linguiServer, localeCookie } from '@/modules/i18n/lingui.server';
import styles from '@/styles/root.css?url';
import React from 'react';
import { data, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';

export const links: Route.LinksFunction = () => [{ rel: 'stylesheet', href: styles }];

export async function loader({ request }: Route.LoaderArgs) {
  const locale = await linguiServer.getLocale(request);
  const cookie = await localeCookie.serialize(locale);

  return data({ locale }, { headers: { 'Set-Cookie': cookie } });
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
