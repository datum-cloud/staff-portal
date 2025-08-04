import { createGenericOAuthProvider, OAuthProviderConfig } from '../oauth.helper';
import { apiRequest } from '@/modules/axios/axios.server';
import { authUserQuery } from '@/resources/request/server';
import { env } from '@/utils/config/env.server';
import { sessionCookie, tokenCookie } from '@/utils/cookies';
import { AuthenticationError } from '@/utils/errors';
import { CodeChallengeMethod, OAuth2Strategy } from 'remix-auth-oauth2';

export interface IZitadelResponse {
  sub: string;
  idToken: string;
  accessToken: string;
  refreshToken: string | null;
  expiredAt: Date;
}

class ZitadelStrategy extends OAuth2Strategy<IZitadelResponse> {
  async logout(request: Request) {
    const { data } = await tokenCookie.get(request);
    if (!data?.idToken) {
      throw new AuthenticationError('No id_token in request');
    }

    const body = new URLSearchParams();
    body.append('id_token_hint', data.idToken);

    await apiRequest({
      method: 'POST',
      url: '/oidc/v1/end_session',
      baseURL: env.AUTH_OIDC_ISSUER,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: body,
    }).execute();
  }

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
  const config: OAuthProviderConfig = {
    name: 'Zitadel',
    issuer: env.AUTH_OIDC_ISSUER,
    clientId: env.AUTH_OIDC_CLIENT_ID,
    clientSecret: env.AUTH_OIDC_CLIENT_SECRET,
    redirectURI: `${env.APP_URL}/auth/callback`,
    scopes: ['openid', 'profile', 'email', 'phone', 'address', 'offline_access'],
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
