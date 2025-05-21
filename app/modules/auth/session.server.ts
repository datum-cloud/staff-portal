import { env } from '@/utils/config';
import { createCookie, createCookieSessionStorage } from 'react-router';

export interface ISession {
  idToken: string;
  accessToken: string;
  refreshToken: string | null;
  expiredAt: Date;
}

interface ISessionResponse {
  session?: ISession;
  headers: Headers;
}

const SESSION_KEY = 'session';

export const sessionCookie = createCookie(SESSION_KEY, {
  path: '/',
  domain: new URL(env.APP_URL).hostname,
  sameSite: 'lax',
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 1, // 1 days
  secrets: [env.SESSION_SECRET],
});

export const sessionStorage = createCookieSessionStorage({
  cookie: sessionCookie,
});

const createSessionResponse = (
  sessionData: ISession | undefined,
  cookieHeader: string
): ISessionResponse => ({
  ...(sessionData ? { session: sessionData } : {}),
  headers: new Headers({
    'Set-Cookie': cookieHeader,
  }),
});

export async function setSession(
  request: Request,
  sessionData: ISession
): Promise<ISessionResponse> {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'));
  session.set(SESSION_KEY, sessionData);
  const cookieHeader = await sessionStorage.commitSession(session);

  return createSessionResponse(sessionData, cookieHeader);
}

export async function getSession(request: Request): Promise<ISessionResponse> {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'));
  const sessionData = session.get(SESSION_KEY);
  const cookieHeader = await sessionStorage.commitSession(session);

  return createSessionResponse(sessionData, cookieHeader);
}

export async function destroySession(request: Request): Promise<ISessionResponse> {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'));
  const cookieHeader = await sessionStorage.destroySession(session);

  return createSessionResponse(undefined, cookieHeader);
}
