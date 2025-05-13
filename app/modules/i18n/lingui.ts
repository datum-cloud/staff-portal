import { i18n } from '@lingui/core';
import { useMatches } from 'react-router';

export async function loadCatalog(locale: string) {
  const { messages } = await import(`./locales/${locale}.po`);

  return i18n.loadAndActivate({ locale, messages });
}

/**
 * Get the locale returned by the root route loader under the `locale` key.
 * @example
 * let locale = useLocale()
 * let formattedDate = date.toLocaleDateString(locale);
 * @example
 * let locale = useLocale("language")
 * let formattedDate = date.toLocaleDateString(locale);
 */
export function useLocale(localeKey = 'locale'): string {
  const defaultLocale = 'en';
  const [rootMatch] = useMatches();
  const { [localeKey]: locale } = (rootMatch.data as Record<string, string>) ?? {};
  if (!locale) return defaultLocale;
  if (typeof locale === 'string') return locale;
  return defaultLocale;
}
