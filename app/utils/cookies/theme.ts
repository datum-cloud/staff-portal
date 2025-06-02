import { env } from '@/utils/config/env.server';
import { createCookieSessionStorage } from 'react-router';
import { createThemeSessionResolver } from 'remix-themes';

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '_theme',
    path: '/',
    domain: new URL(env.APP_URL).hostname,
    httpOnly: true,
    sameSite: 'lax',
    secrets: [env.SESSION_SECRET],
  },
});

export const themeSessionResolver = createThemeSessionResolver(sessionStorage);
