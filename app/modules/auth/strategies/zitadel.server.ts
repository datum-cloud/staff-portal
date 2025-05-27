import { apiRequest } from '@/modules/axios';
import { env } from '@/utils/config/env.server';
import { tokenCookie } from '@/utils/cookies';
import { AuthenticationError } from '@/utils/errors';
import { OAuth2Strategy } from 'remix-auth-oauth2';
import { z } from 'zod';

const UserInfoSchema = z.object({
  email: z.string().email(),
  email_verified: z.boolean(),
  family_name: z.string(),
  given_name: z.string(),
  locale: z.string(),
  name: z.string(),
  preferred_username: z.string(),
  sub: z.string(),
  updated_at: z.number(),
  'urn:zitadel:iam:org:id': z.string(),
  'urn:zitadel:iam:user:resourceowner:id': z.string(),
  'urn:zitadel:iam:user:resourceowner:name': z.string(),
  'urn:zitadel:iam:user:resourceowner:primary_domain': z.string(),
});

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
      'urn:zitadel:iam:org:id:320164429750667059',
    ],
  },
  async ({ tokens }): Promise<IZitadelResponse> => {
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
    })
      .output(UserInfoSchema)
      .execute();

    return {
      idToken: tokens.idToken(),
      accessToken: tokens.accessToken(),
      refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : null,
      expiredAt: tokens.accessTokenExpiresAt(),
      sub: user.sub,
    };
  }
);
