import type { Route } from './+types/logout';
import { clearChats } from '@/features/assistant/lib/chat-storage';
import { buildEndSessionRequest } from '@/modules/auth/end-session.server';
import { routes } from '@/utils/config/routes.config';
import { sessionCookie, tokenCookie } from '@/utils/cookies';
import { combineHeaders } from '@/utils/helpers';
import { useEffect, useRef } from 'react';
import { data, redirect } from 'react-router';

export function meta({}: Route.MetaFunction) {
  return [
    { title: 'Datum - Staff Portal' },
    { name: 'description', content: 'Welcome to Datum - Staff Portal' },
  ];
}

/**
 * Clears the local session, then hands the page the IdP's end_session form so
 * the browser ends the Zitadel session too and the next login asks for
 * credentials. The page holds the id token, so it must not be cached. Without
 * an id token there is nothing to end there, so it goes straight to /login.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const { data: tokenData } = await tokenCookie.get(request);
  const endSession = buildEndSessionRequest(tokenData?.idToken);

  const token = await tokenCookie.destroy(request);
  const session = await sessionCookie.destroy(request);

  if (!endSession) {
    return redirect(routes.login(), { headers: combineHeaders(token.headers, session.headers) });
  }
  return data(
    { endSession },
    {
      headers: combineHeaders(token.headers, session.headers, { 'Cache-Control': 'no-store' }),
    }
  );
}

/** Puts the loader's cookie clears and no-store on the document response. */
export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

/**
 * Runs in the browser when sign-out starts from inside the app (the user menu,
 * the Access Denied page). It removes stored assistant transcripts, then loads
 * /logout as a full document instead of fetching /logout.data.
 *
 * Fetching /logout.data cleared the cookies (and the id token) before the
 * browser left the app, and when this route's component chunk then failed to
 * load React Router reloaded /logout with no id token left, so the Zitadel
 * session survived. A document load keeps the id token until the server
 * renders the end_session form. `clientLoader` doesn't run on that document
 * load (no `hydrate`), so this can't loop.
 */
export async function clientLoader(_args: Route.ClientLoaderArgs): Promise<never> {
  clearChats();
  window.location.assign(routes.logout());
  // Nothing to render: the page is being replaced.
  return new Promise<never>(() => {});
}

/**
 * Posts the end_session form as soon as the page loads; Zitadel then returns
 * the browser to /login. It shows no text, so it needs no Lingui macro: this
 * route's component builds into its own chunk (the route has a `clientLoader`),
 * where a macro is not compiled and the chunk would throw on load.
 */
export default function Logout({ loaderData }: Route.ComponentProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const { action, fields } = loaderData.endSession;

  useEffect(() => {
    formRef.current?.submit();
  }, []);

  return (
    <form ref={formRef} method="post" action={action} hidden>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </form>
  );
}
