import { ISession } from '../session.server';
import { apiRequest } from '@/modules/axios';
import { env } from '@/utils/config/env.server';
import { AuthenticationError } from '@/utils/errors';
import { OAuth2Strategy } from 'remix-auth-oauth2';

export const zitadelStrategy = await OAuth2Strategy.discover<ISession>(
  env.AUTH_OIDC_ISSUER,
  {
    clientId: env.AUTH_OIDC_CLIENT_ID,
    clientSecret: env.AUTH_OIDC_CLIENT_SECRET,
    redirectURI: `${env.APP_URL}/auth/callback`,
    scopes: [
      'openid',
      'profile',
      'email',
      'phone',
      'address',
      'offline_access',
      'urn:zitadel:iam:org:id:320164429750667059',
    ],
  },
  async ({ tokens }): Promise<ISession> => {
    if (!tokens.idToken()) {
      throw new AuthenticationError('No id_token in response');
    }

    if (!tokens.accessToken()) {
      throw new AuthenticationError('No access_token in response');
    }

    const user = await apiRequest({
      method: 'GET',
      url: '/oidc/v1/userinfo',
      baseURL: env.AUTH_OIDC_ISSUER,
      headers: {
        Authorization: `Bearer ${tokens.accessToken()}`,
      },
    });
    console.log(user);

    return {
      accessToken: tokens.accessToken(),
      idToken: tokens.idToken(),
      refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : null,
      expiredAt: tokens.accessTokenExpiresAt(),
    };
  }
);
