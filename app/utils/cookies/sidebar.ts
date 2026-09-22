/**
 * The Milo sub-nav rail's collapsed/expanded preference. Deliberately not a
 * `createCookie` like the rest of this directory: `SIDEBAR_COOKIE_NAME` is
 * written client-side (by the rail itself today; by datum-ui's
 * `SidebarProvider` once the rail moves onto it, see the sub-nav parity
 * plan), so it's unsigned and not `httpOnly` — a signed/`httpOnly` cookie
 * jar would never see it written and would silently never match.
 *
 * Stores "open" (expanded), not "collapsed", to match datum-ui's own
 * `sidebar_state` cookie format byte-for-byte — see
 * `useSubNavCollapsed` for why that matters.
 */
export const SIDEBAR_COOKIE_NAME = 'sidebar_state';

/**
 * Parses `SIDEBAR_COOKIE_NAME` out of a raw cookie header string (works for
 * both a `Request`'s `Cookie` header server-side and `document.cookie`
 * client-side — same `key=value; key2=value2` format either way).
 * `undefined` means "no preference recorded" — callers apply their own
 * default rather than being handed a guess.
 */
export function parseSidebarState(cookieHeader: string | null | undefined): boolean | undefined {
  if (!cookieHeader) return undefined;

  for (const pair of cookieHeader.split(';')) {
    const separator = pair.indexOf('=');
    if (separator === -1) continue;

    // Exact match only — `x_sidebar_state=true` must not match `sidebar_state`.
    if (pair.slice(0, separator).trim() !== SIDEBAR_COOKIE_NAME) continue;

    const value = pair.slice(separator + 1).trim();
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }

  return undefined;
}

/** Server-side read: pulls `SIDEBAR_COOKIE_NAME` off the request's `Cookie` header. */
export function getSidebarState(request: Request): boolean | undefined {
  return parseSidebarState(request.headers.get('Cookie'));
}
