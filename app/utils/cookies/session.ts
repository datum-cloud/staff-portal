import { BaseCookie, IBaseCookieData } from './base';

interface ISessionCookieData extends IBaseCookieData {
  sub: string;
  accessToken: string;
  refreshToken: string | null;
  expiredAt: Date;
}

class SessionCookie extends BaseCookie<ISessionCookieData> {
  protected readonly COOKIE_KEY = '_session';
  protected readonly MAX_AGE = 7 * 24 * 60 * 60;

  /**
   * An old signed-only cookie may have been copied from a log, so its sealed
   * replacement keeps the access token but never the refresh token: once the
   * access token expires, the user signs in again.
   */
  protected forUpgrade(data: ISessionCookieData): ISessionCookieData {
    return { ...data, refreshToken: null };
  }
}

export const sessionCookie = SessionCookie.create();
