/**
 * Minimal browser-side GraphQL client for the staff portal.
 *
 * Talks to the Hono `/api/graphql` proxy which forwards to the
 * graphql-gateway with the caller's bearer token. Returns the parsed
 * `data` field or throws on transport / GraphQL errors.
 *
 * We deliberately skip a full client (urql/apollo) and codegen: staff
 * portal only consumes one enrichment query today. If more queries
 * land, lift the cloud-portal pattern at that point.
 */

const GRAPHQL_PROXY_URL = '/api/graphql';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function gqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(GRAPHQL_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const body = (await response.json()) as GraphQLResponse<T>;
  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join('; '));
  }
  if (body.data === undefined) {
    throw new Error('GraphQL response missing data');
  }
  return body.data;
}
