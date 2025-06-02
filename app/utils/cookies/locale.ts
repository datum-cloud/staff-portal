import { env } from '@/utils/config/env.server';
import { createCookie } from 'react-router';

export const localeCookie = createCookie('lng', {
  path: '/',
  domain: new URL(env.APP_URL).hostname,
  httpOnly: true,
  sameSite: 'lax',
  secrets: [env.SESSION_SECRET],
});
