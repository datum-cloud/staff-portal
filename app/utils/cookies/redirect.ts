import { env } from '@/utils/config/env.server';
import { createCookie } from 'react-router';

/**
 * Extracts path (pathname + search) from a URL string.
 */
export function getRedirectToPath(url: string): string {
  const { pathname, search } = new URL(url);
  return pathname + search;
}

/**
 * Validates that a path is safe for redirect (prevents open redirects).
 * Only allows relative paths starting with / but not //.
 */
export function isValidRedirectPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//');
}

/**
 * Returns the redirect destination from a raw cookie value.
 * Returns '/' if the value is invalid or not a safe path.
 */
export function getRedirectDestination(value: unknown): string {
  return typeof value === 'string' && isValidRedirectPath(value) ? value : '/';
}

/**
 * Builds the login URL with optional redirectTo param.
 * Returns '/login' when redirectTo is '/' or empty.
 */
export function getLoginUrl(redirectTo: string): string {
  return redirectTo === '/' || !redirectTo
    ? '/login'
    : `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
}

/** Type guard for redirect Response thrown by OAuth strategy. */
export function isRedirectResponse(error: unknown): error is Response {
  return error instanceof Response && error.status >= 300 && error.status < 400;
}

/**
 * Cookie to persist the original URL for redirect-after-login.
 * Short-lived (5 min) - only needed during the OAuth flow.
 */
export const redirectToCookie = createCookie('redirect_to', {
  path: '/',
  domain: new URL(env.APP_URL).hostname,
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 60 * 5, // 5 minutes
  secrets: [env.SESSION_SECRET],
});
