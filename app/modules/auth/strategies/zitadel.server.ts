import { apiRequest } from '@/modules/axios/axios.server';
import { authUserQuery } from '@/resources/request/server/auth.request';
import { env } from '@/utils/config/env.server';
import { sessionCookie, tokenCookie } from '@/utils/cookies';
import { AuthenticationError } from '@/utils/errors';
import { OAuth2Strategy } from 'remix-auth-oauth2';

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

export const zitadelStrategy = await ZitadelStrategy.discover<IZitadelResponse>(
  env.AUTH_OIDC_ISSUER,
  {
    clientId: env.AUTH_OIDC_CLIENT_ID,
    clientSecret: env.AUTH_OIDC_CLIENT_SECRET ?? null,
    redirectURI: `${env.APP_URL}/auth/callback`,
    scopes: [
      'openid',
      'profile',
      'email',
      'phone',
      'address',
      'offline_access',
      // 'urn:zitadel:iam:org:id:320164429750667059',
      // 'urn:zitadel:iam:org:project:id:318312178111218908:aud',
    ],
  },
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
