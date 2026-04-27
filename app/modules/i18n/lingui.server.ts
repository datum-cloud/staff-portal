import config from '../../../lingui.config';
import { ReactRouterLingui } from './react-router.server';
import { localeCookie } from '@/utils/cookies';

export const linguiServer = new ReactRouterLingui({
  detection: {
    supportedLanguages: config.locales,
    fallbackLanguage: (() => {
      const locales = config.fallbackLocales;
      if (!locales) return 'en';
      const fallback = locales.default;
      if (Array.isArray(fallback)) return fallback[0] ?? 'en';
      return fallback || 'en';
    })(),
    cookie: localeCookie,
  },
});
