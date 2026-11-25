import { env } from '@/utils/config/env.server';
import { routes } from '@/utils/config/routes.config';

export interface EndSessionConfig {
  issuer: string;
  clientId: string;
  /** Must be registered on the Zitadel app (infra's zitadel-setup Pulumi registers `${APP_URL}/login`). */
  postLogoutRedirectUri: string;
}

/** The form the browser posts to the IdP's end_session endpoint. */
export interface EndSessionRequest {
  action: string;
  fields: Record<string, string>;
}

const defaultConfig = (): EndSessionConfig => ({
  issuer: env.AUTH_OIDC_ISSUER,
  clientId: env.AUTH_OIDC_CLIENT_ID,
  postLogoutRedirectUri: new URL(routes.login(), env.APP_URL).toString(),
});

/**
 * The OIDC end_session request the browser makes on sign-out, or null without
 * an id token (the caller then only clears the local session).
 *
 * The browser makes it so Zitadel ends the session before the user is sent
 * back: the old server-side POST was fired without waiting, so the next
 * authorize request could reach Zitadel first and sign the user straight back
 * in. It is a form POST, not a URL, so the id token (which carries the user's
 * name and email) stays out of browser history and the IdP's access logs.
 *
 * `client_id` and `post_logout_redirect_uri` go together or not at all: Zitadel
 * answers 400 for an unregistered redirect URI next to a client id. Without
 * them the user ends on Zitadel's own signed-out page.
 */
export function buildEndSessionRequest(
  idToken: string | undefined,
  config: EndSessionConfig = defaultConfig()
): EndSessionRequest | null {
  if (!idToken) return null;

  const action = `${config.issuer.replace(/\/+$/, '')}/oidc/v1/end_session`;
  const returnFields: Record<string, string> =
    config.clientId && config.postLogoutRedirectUri
      ? { client_id: config.clientId, post_logout_redirect_uri: config.postLogoutRedirectUri }
      : {};
  return { action, fields: { id_token_hint: idToken, ...returnFields } };
}
