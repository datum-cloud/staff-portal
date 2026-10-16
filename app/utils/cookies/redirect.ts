import { env } from '@/utils/config/env.server';
import { createCookie } from 'react-router';

/**
 * Extracts path (pathname + search) from a URL string.
 */
export function getRedirectToPath(url: string): string {
  const { pathname, search } = new URL(url);
  return pathname + search;
}

/** Placeholder origin used only to check that a relative path stays on this site. */
const SAME_SITE_BASE = 'http://staff-portal.invalid';

/** Auth routes that would loop back into login if used as a destination. */
const AUTH_ROUTE = /^\/(login|logout|auth)(\/|$)/;

/**
 * Validates that a path is safe for redirect (prevents open redirects).
 *
 * The path is parsed rather than prefix-checked: browsers follow the WHATWG URL
 * rules, under which `/\host`, `/\/host` and `/<tab>/host` all name another
 * site, and only a real parse catches every spelling. Auth routes are rejected
 * so a saved destination can never send the user back into login.
 */
export function isValidRedirectPath(path: string): boolean {
  if (!path.startsWith('/')) return false;

  let resolved: URL;
  try {
    resolved = new URL(path, SAME_SITE_BASE);
  } catch {
    return false;
  }
  if (resolved.origin !== SAME_SITE_BASE) return false;

  return !AUTH_ROUTE.test(resolved.pathname);
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

/** How long the saved URL survives (1 hour), enough to finish a slow re-login. */
export const REDIRECT_TO_MAX_AGE = 60 * 60;

/**
 * Cookie to persist the original URL for redirect-after-login.
 * Set by `/login?redirectTo=` and cleared by a plain `/login` (manual Sign out).
 */
export const redirectToCookie = createCookie('redirect_to', {
  path: '/',
  domain: new URL(env.APP_URL).hostname,
  httpOnly: true,
  sameSite: 'lax',
  maxAge: REDIRECT_TO_MAX_AGE,
  secrets: [env.SESSION_SECRET],
});
