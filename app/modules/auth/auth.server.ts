import { zitadelStrategy } from './strategies/zitadel.server';
import { AuthenticationError } from '@/utils/errors';
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
      throw new AuthenticationError(`Strategy ${strategy} not found`);
    }

    if (typeof (provider as any).logout === 'function') {
      return await (provider as any).logout(request);
    }

    throw new AuthenticationError(`Strategy ${strategy} does not support logout`);
  }
}

// Use the extended class instead of the base Authenticator
export const authenticator = new CustomAuthenticator();

// provide support for multiple strategies
authenticator.use(zitadelStrategy, 'zitadel');
