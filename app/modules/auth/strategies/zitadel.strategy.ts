import { createGenericOAuthProvider, OAuthProviderConfig, OIDCPrompt } from '../oauth.helper';
import { authUserQuery } from '@/resources/request/server';
import { env } from '@/utils/config/env.server';
import { sessionCookie } from '@/utils/cookies';
import { AuthenticationError } from '@/utils/errors';
import { OAuth2Strategy } from 'remix-auth-oauth2';

export interface IZitadelResponse {
  sub: string;
  idToken: string;
  accessToken: string;
  refreshToken: string | null;
  expiredAt: Date;
}

// Sign-out does not go through the strategy: the logout route sends the
// browser to end_session (see `buildEndSessionUrl`), since only the browser
// carries the Zitadel session cookies.
class ZitadelStrategy extends OAuth2Strategy<IZitadelResponse> {
  async refresh(request: Request): Promise<IZitadelResponse> {
    const { data } = await sessionCookie.get(request);
    if (!data?.refreshToken) {
      throw new AuthenticationError('No refresh_token in request');
    }

    const tokens = await this.refreshToken(data.refreshToken);

    return {
      idToken: tokens.idToken(),
      accessToken: tokens.accessToken(),
      refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : null,
      expiredAt: tokens.accessTokenExpiresAt(),
      sub: data.sub,
    };
  }
}

export async function createZitadelStrategy() {
  const defaultScopes = ['openid', 'profile', 'email', 'phone', 'address', 'offline_access'];
  const mergedScopes = Array.from(
    new Set([...(defaultScopes as string[]), ...((env.authOidcScopes as string[]) ?? [])])
  );

  const config: OAuthProviderConfig = {
    name: 'Zitadel',
    issuer: env.AUTH_OIDC_ISSUER,
    clientId: env.AUTH_OIDC_CLIENT_ID,
    clientSecret: env.AUTH_OIDC_CLIENT_SECRET,
    redirectURI: `${env.APP_URL}/auth/callback`,
    scopes: mergedScopes,
    // Force re-authentication to avoid silent SSO
    prompt: OIDCPrompt.LOGIN,
  };

  return createGenericOAuthProvider(
    config,
    ZitadelStrategy,
    async ({ tokens }): Promise<IZitadelResponse> => {
      if (!tokens.idToken()) {
        throw new AuthenticationError('No id_token in response');
      }

      if (!tokens.accessToken()) {
        throw new AuthenticationError('No access_token in response');
      }

      const user = await authUserQuery(tokens.accessToken());

      return {
        idToken: tokens.idToken(),
        accessToken: tokens.accessToken(),
        refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : null,
        expiredAt: tokens.accessTokenExpiresAt(),
        sub: user.sub,
      };
    }
  );
}
