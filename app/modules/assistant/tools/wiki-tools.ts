import { graphqlRequest, isToolError, type ToolError } from './http';
import { env } from '@/utils/config/env.server';
import { tool } from 'ai';
import { z } from 'zod';

/**
 * Internal Datum wiki (Wiki.js v2) as an assistant knowledge source.
 *
 * The wiki holds internal operational knowledge — runbooks, SLAs, provisioning
 * procedures, architecture notes. It is reached over the Wiki.js GraphQL API
 * (`WIKI_API_URL`) with a service token (`WIKI_TOKEN`); the endpoint is not
 * behind the wiki's SSO proxy, so server-to-server calls work directly.
 *
 * This is distinct from `getDatumPlatformDocs`, which serves the *public*
 * product/CLI documentation.
 */

/** Max characters of a page body returned to the model (keeps context bounded). */
export const MAX_WIKI_CONTENT = 40_000;

/** Truncates an over-long page body, marking where it was cut. */
export function capContent(content: string, max = MAX_WIKI_CONTENT): string {
  return content.length > max ? `${content.slice(0, max)}\n\n[truncated]` : content;
}

/**
 * Human-facing URL for a wiki page, derived from the GraphQL endpoint by
 * dropping its `/graphql` suffix. Returned so the model links to the real wiki
 * instead of guessing a host.
 */
export function wikiPageUrl(path: string, apiUrl = env.wikiApiUrl): string | undefined {
  if (!apiUrl) return undefined;
  return `${apiUrl.replace(/\/graphql\/?$/, '')}/${path}`;
}

interface WikiSearchResult {
  id: string;
  title: string;
  description: string;
  path: string;
  locale: string;
}

interface WikiPage {
  id: number;
  path: string;
  title: string;
  description: string;
  content: string;
  updatedAt: string;
}

type WikiPageListItem = Omit<WikiPage, 'content'>;

async function wikiQuery<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T | ToolError> {
  if (!env.wikiApiUrl || !env.wikiApiToken) {
    return { error: 'Wiki is not configured' };
  }
  return graphqlRequest<T>(env.wikiApiUrl, query, variables, {
    token: env.wikiApiToken,
    label: 'Wiki',
  });
}

const SEARCH_QUERY = `query SearchWiki($query: String!) {
  pages {
    search(query: $query) {
      results { id title description path locale }
      totalHits
    }
  }
}`;

const SINGLE_QUERY = `query GetWikiPage($id: Int!) {
  pages {
    single(id: $id) { id path title description content updatedAt }
  }
}`;

const LIST_QUERY = `query ListWikiPages {
  pages {
    list(orderBy: TITLE) { id path title description updatedAt }
  }
}`;

export function createWikiTools() {
  return {
    searchWiki: tool({
      description:
        'Search the internal Datum wiki (runbooks, SLAs, provisioning, architecture, ops process) and return matching pages ranked by relevance, with title, description, path, and numeric id — but NOT the page body.' +
        ' Call this for internal "how do we…" / process / policy questions, then use getWikiPage to read a result.' +
        ' This is the INTERNAL wiki — distinct from getDatumPlatformDocs (public product/CLI docs).',
      inputSchema: z.object({
        query: z.string().describe('Search terms, e.g. "tenant provisioning", "SLA thresholds"'),
      }),
      execute: async ({ query }: { query: string }) => {
        const data = await wikiQuery<{
          pages: { search: { results: WikiSearchResult[]; totalHits: number } };
        }>(SEARCH_QUERY, { query });
        if (isToolError(data)) return data;
        const { results, totalHits } = data.pages.search;
        return {
          results: results.map((r) => ({ ...r, url: wikiPageUrl(r.path) })),
          totalHits,
        };
      },
    }),

    getWikiPage: tool({
      description:
        'Fetch the full markdown content of one internal wiki page by its numeric id (obtained from searchWiki or listWikiPages). Use after searchWiki to read the page body.',
      inputSchema: z.object({
        id: z
          .number()
          .int()
          .describe('Numeric wiki page id returned by searchWiki / listWikiPages'),
      }),
      execute: async ({ id }: { id: number }) => {
        const data = await wikiQuery<{ pages: { single: WikiPage | null } }>(SINGLE_QUERY, { id });
        if (isToolError(data)) return data;
        const page = data.pages.single;
        if (!page) return { error: `Wiki page ${id} not found` };
        return { ...page, url: wikiPageUrl(page.path), content: capContent(page.content ?? '') };
      },
    }),

    listWikiPages: tool({
      description:
        'List every internal wiki page (numeric id, path, title, description), ordered by title. Use to browse what the wiki covers when a search term is unclear.',
      inputSchema: z.object({}),
      execute: async () => {
        const data = await wikiQuery<{ pages: { list: WikiPageListItem[] } }>(LIST_QUERY);
        if (isToolError(data)) return data;
        return { pages: data.pages.list.map((p) => ({ ...p, url: wikiPageUrl(p.path) })) };
      },
    }),
  };
}
