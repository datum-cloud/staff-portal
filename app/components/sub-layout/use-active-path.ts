export const normalizePath = (path: string) => path.replace(/\/+$/, '');

export function isPathActive(pathname: string, href: string) {
  const n = normalizePath(pathname);
  const h = normalizePath(href);
  return n === h || n.startsWith(h + '/');
}

/**
 * Given a list of hrefs and the current pathname, return the href of the
 * "most specific" match — i.e. the longest href whose path matches the
 * current location via {@link isPathActive}. Used to pick a single active
 * item when nested routes would otherwise cause multiple prefix matches
 * (e.g. an Overview tab pointing at the parent route).
 */
export function pickMostSpecificHref(
  pathname: string,
  hrefs: (string | undefined)[]
): string | null {
  const n = normalizePath(pathname);
  let best: string | null = null;
  let bestLen = -1;
  for (const href of hrefs) {
    if (!href) continue;
    const h = normalizePath(href);
    if (n === h || n.startsWith(h + '/')) {
      if (h.length > bestLen) {
        bestLen = h.length;
        best = href;
      }
    }
  }
  return best;
}
