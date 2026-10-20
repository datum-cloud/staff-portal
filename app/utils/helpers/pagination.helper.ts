import { CursorExpiredError } from '@/utils/errors';

export interface CursorPage<T> {
  items: T[];
  continueToken?: string | null;
}

export interface WalkCursorPagesOptions<T> {
  /** Safety net against a runaway walk (e.g. a continueToken loop bug). */
  maxPages: number;
  /** Applied per page before its items are collected (e.g. client-side search). */
  filterPage?: (items: T[]) => T[];
}

/**
 * Walks `continueToken` to collect every page. An expired cursor takes the
 * entries already collected with it, so the walk restarts once from the first
 * page; a second expiry (or any other failure) propagates to the caller.
 */
export async function walkCursorPages<T>(
  fetchPage: (cursor?: string) => Promise<CursorPage<T>>,
  { maxPages, filterPage }: WalkCursorPagesOptions<T>
): Promise<{ items: T[]; hasMore: boolean }> {
  const walk = async () => {
    const items: T[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < maxPages; page++) {
      const result = await fetchPage(cursor);
      items.push(...(filterPage ? filterPage(result.items) : result.items));
      cursor = result.continueToken ?? undefined;
      if (!cursor) return { items, hasMore: false };
    }

    return { items, hasMore: Boolean(cursor) };
  };

  try {
    return await walk();
  } catch (error) {
    if (!(error instanceof CursorExpiredError)) throw error;
    return walk();
  }
}
