import { REQUEST_CONTEXT_STORE_KEY } from './context-key';
import { buildScopedPath, buildProxyPath } from './endpoints';
import { generateQueryOp } from './generated';
import type { FieldsSelection, Query, QueryRequest } from './generated';
import type { GqlScope } from './types';
import { mapApiError } from '@/utils/errors/error-mapper';
import { createClient, cacheExchange, fetchExchange } from '@urql/core';
import type { Client as UrqlClient, SSRExchange } from '@urql/core';

function getRequestContext() {
  if (typeof window !== 'undefined') return undefined;
  try {
    const store = (globalThis as any)[REQUEST_CONTEXT_STORE_KEY];
    if (store && typeof store.getStore === 'function') {
      return store.getStore();
    }
  } catch {
    // Ignore errors
  }
  return undefined;
}

/**
 * Wraps native fetch with Authorization and X-Request-ID headers
 * sourced from AsyncLocalStorage (same data as the axios.server interceptor).
 */
function buildAuthFetch(token?: string, requestId?: string, userAgent?: string): typeof fetch {
  return ((input: RequestInfo | URL, init: RequestInit = {}) =>
    fetch(input as any, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(requestId ? { 'X-Request-ID': requestId } : {}),
        ...(userAgent ? { 'User-Agent': userAgent } : {}),
      },
    })) as typeof fetch;
}

/**
 * Creates a URQL client scoped to the given GqlScope.
 *
 * - Server: direct to GRAPHQL_URL with auth from AsyncLocalStorage
 * - Client: through /api/graphql proxy (session cookie auth, handled by Hono)
 *
 * Pass an ssrExchange instance to participate in SSR→CSR cache hydration.
 */
export function createGqlClient(scope: GqlScope, ssr?: SSRExchange): UrqlClient {
  const isServer = typeof window === 'undefined';

  if (isServer) {
    const ctx = getRequestContext();

    // Resolve 'me' to actual userId from AsyncLocalStorage context
    let resolvedScope = scope;
    if (scope.type === 'user' && scope.userId === 'me' && ctx?.userId) {
      resolvedScope = { type: 'user', userId: ctx.userId };
    }

    const url = `${process.env.GRAPHQL_URL}${buildScopedPath(resolvedScope)}`;

    return createClient({
      url,
      preferGetMethod: false, // @urql/core@6 defaults to GET; backend requires POST
      exchanges: [cacheExchange, ...(ssr ? [ssr] : []), fetchExchange],
      fetch: buildAuthFetch(ctx?.token, ctx?.requestId, ctx?.userAgent),
    });
  }

  // Client-side: Hono proxy at /api/graphql handles auth via session cookie
  return createClient({
    url: buildProxyPath(scope),
    preferGetMethod: false, // @urql/core@6 defaults to GET; backend requires POST
    exchanges: [cacheExchange, ...(ssr ? [ssr] : []), fetchExchange],
  });
}

/**
 * Builds a named GraphQL operation with genql and runs it on a scoped urql
 * client, returning the typed result data.
 *
 * This is the single execution primitive the gql operations layer
 * (`resources/gql/*.gql.ts`) is built on. Because genql's
 * `generateQueryOp` only emits an untyped query string, running it through urql
 * would otherwise lose the result type — the `FieldsSelection<Query, R>` return
 * carries the shape of the caller's selection back through, so ops are typed
 * from their fields instead of `any`. `__name` is spread in outside `R` so it
 * never pollutes the inferred result type.
 */
export async function runGqlQuery<R extends QueryRequest>(
  name: string,
  request: R,
  scope: GqlScope = { type: 'global' }
): Promise<FieldsSelection<Query, R> | null> {
  const client = createGqlClient(scope);
  const op = generateQueryOp({ __name: name, ...request });
  const result = await client.query(op.query, op.variables).toPromise();
  if (result.error) throw mapApiError(result.error);
  return (result.data as FieldsSelection<Query, R> | undefined) ?? null;
}

/**
 * The non-null result data of a gql operation function (a `*.gql.ts` export).
 * Lets pass-through resources derive their row types straight from the op's
 * selection instead of re-declaring an interface, e.g.
 *   `type GqlProject = NonNullable<GqlResult<typeof projectsOp>['projects']>['items'][number]`.
 */
export type GqlResult<Op extends (...args: never[]) => Promise<unknown>> = NonNullable<
  Awaited<ReturnType<Op>>
>;

export type { GqlScope } from './types';
