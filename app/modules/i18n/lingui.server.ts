import config from '../../../lingui.config';
import { ReactRouterLingui } from './react-router.server';
import { env } from '@/utils/config';
import { createCookie } from 'react-router';

export const localeCookie = createCookie('lng', {
  path: '/',
  sameSite: 'lax',
  secure: env.isProd,
  httpOnly: true,
});

export const linguiServer = new ReactRouterLingui({
  detection: {
    supportedLanguages: config.locales,
    fallbackLanguage: (!!config.fallbackLocales && config.fallbackLocales?.default) || 'en',
    cookie: localeCookie,
  },
});
