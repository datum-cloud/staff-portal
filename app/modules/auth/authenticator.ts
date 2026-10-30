import { ISession } from './types';
import { sessionCookie, tokenCookie } from '@/utils/cookies';
import { AuthenticationError } from '@/utils/errors';
import { combineHeaders } from '@/utils/helpers';
import { isPast } from 'date-fns';
import { Authenticator } from 'remix-auth';

/**
 * Copy a request into a plain Fetch `Request`.
 *
 * React Router v8 passes the server's raw request through to loaders. On Node
 * that is @hono/node-server's lightweight request, and remix-auth's
 * `new Request(request.url, request)` reads `duplex` from it, which throws
 * "Illegal invocation". A request built from plain init avoids that.
 */
function toFetchRequest(request: Request): Request {
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    signal: request.signal,
    ...(hasBody && { body: request.body, duplex: 'half' }),
  } as RequestInit);
}

// Extend the Authenticator class
export class CustomAuthenticator extends Authenticator<ISession> {
  authenticate(strategy: string, request: Request): Promise<ISession> {
    return super.authenticate(strategy, toFetchRequest(request));
  }

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
