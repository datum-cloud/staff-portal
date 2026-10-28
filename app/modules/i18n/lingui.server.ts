import config from '../../../lingui.config';
import { ReactRouterLingui } from './react-router.server';
import { localeCookie } from '@/utils/cookies';

export const linguiServer = new ReactRouterLingui({
  detection: {
    supportedLanguages: config.locales,
    fallbackLanguage: (!!config.fallbackLocales && config.fallbackLocales?.default) || 'en',
    cookie: localeCookie,
  },
});
