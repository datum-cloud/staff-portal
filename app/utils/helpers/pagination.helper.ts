import { CursorExpiredError } from '@/utils/errors';

export interface CursorPage<T> {
  items: T[];
  continueToken?: string | null;
}

export interface WalkCursorPagesOptions<T> {
  /** Total request budget for the walk, including a restart after expiry. */
  maxPages: number;
  /** Applied per page before its items are collected (e.g. client-side search). */
  filterPage?: (items: T[]) => T[];
}

/**
 * Walks `continueToken` to collect every page. An expired cursor takes the
 * entries already collected with it, so the walk restarts once from the first
 * page; both walks share `maxPages`, and a second expiry (or any other failure)
 * propagates to the caller. Expiry on the cursor-less first request cannot be
 * fixed by restarting, so it propagates at once.
 */
export async function walkCursorPages<T>(
  fetchPage: (cursor?: string) => Promise<CursorPage<T>>,
  { maxPages, filterPage }: WalkCursorPagesOptions<T>
): Promise<{ items: T[]; hasMore: boolean }> {
  let pagesLeft = maxPages;
  let restarted = false;

  for (;;) {
    const items: T[] = [];
    let cursor: string | undefined;
    let expired = false;

    while (pagesLeft > 0) {
      const requestedCursor = cursor;
      pagesLeft--;

      let result: CursorPage<T>;
      try {
        result = await fetchPage(requestedCursor);
      } catch (error) {
        const canRestart =
          error instanceof CursorExpiredError &&
          requestedCursor !== undefined &&
          !restarted &&
          pagesLeft > 0;

        if (!canRestart) throw error;
        expired = true;
        break;
      }

      items.push(...(filterPage ? filterPage(result.items) : result.items));
      cursor = result.continueToken ?? undefined;
      if (!cursor) return { items, hasMore: false };
    }

    if (!expired) return { items, hasMore: Boolean(cursor) };

    restarted = true;
  }
}
