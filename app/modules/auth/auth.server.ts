import { zitadelStrategy } from './strategies/zitadel.server';
import { sessionCookie, tokenCookie } from '@/utils/cookies';
import { AuthenticationError } from '@/utils/errors';
import { combineHeaders } from '@/utils/helpers';
import { isPast } from 'date-fns';
import { Authenticator } from 'remix-auth';

export interface ISession {
  sub: string;
  idToken: string;
  accessToken: string;
  refreshToken: string | null;
  expiredAt: Date;
}

// Extend the Authenticator class
class CustomAuthenticator extends Authenticator<ISession> {
  async logout(strategy: string, request: Request) {
    const provider = this.get(strategy);
    if (!provider) {
      throw new AuthenticationError(`Strategy ${strategy} not found`).toResponse();
    }

    if (typeof (provider as any).logout === 'function') {
      return await (provider as any).logout(request);
    }

    throw new AuthenticationError(`Strategy ${strategy} does not support logout`).toResponse();
  }

  async refresh(strategy: string, request: Request): Promise<ISession> {
    const provider = this.get(strategy);
    if (!provider) {
      throw new AuthenticationError(`Strategy ${strategy} not found`).toResponse();
    }

    if (typeof (provider as any).refresh === 'function') {
      return await (provider as any).refresh(request);
    }

    throw new AuthenticationError(
      `Strategy ${strategy} does not support refresh token`
    ).toResponse();
  }

  async isAuthenticated(request: Request): Promise<boolean> {
    const session = await sessionCookie.get(request);
    return !!session?.data;
  }

  async isValidSession(request: Request): Promise<boolean> {
    const session = await sessionCookie.get(request);

    // Check if session is expired
    if (session?.data?.expiredAt && isPast(session.data.expiredAt)) {
      // Todo: refresh token

      return false;
    }

    return true;
  }

  async getSession(request: Request): Promise<(ISession & { headers: Headers }) | null> {
    const session = await sessionCookie.get(request);
    const idToken = await tokenCookie.get(request);

    return {
      sub: session.data?.sub ?? '',
      idToken: idToken.data?.idToken ?? '',
      accessToken: session.data?.accessToken ?? '',
      refreshToken: session.data?.refreshToken ?? null,
      expiredAt: session.data?.expiredAt ?? new Date(),
      headers: combineHeaders(session.headers, idToken.headers),
    };
  }
}

// Use the extended class instead of the base Authenticator
export const authenticator = new CustomAuthenticator();

// provide support for multiple strategies
authenticator.use(zitadelStrategy, 'zitadel');
