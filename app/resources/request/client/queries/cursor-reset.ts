import { CursorExpiredError } from '@/utils/errors';

/**
 * Loads one page of a cursor-paged list, restarting from the first page once if
 * the gateway says the cursor expired. A second expiry surfaces to the caller.
 */
export async function withCursorReset<T>(
  fetchPage: (cursor?: string) => Promise<T>,
  cursor?: string
): Promise<T> {
  if (!cursor) return fetchPage();

  try {
    return await fetchPage(cursor);
  } catch (error) {
    if (!(error instanceof CursorExpiredError)) throw error;
    return fetchPage();
  }
}
