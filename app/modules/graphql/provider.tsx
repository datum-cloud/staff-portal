import { createGqlClient } from './client';
import type { GqlScope } from './types';
import { ssrExchange } from '@urql/core';
import type { SSRData } from '@urql/core';
import React, { useMemo } from 'react';
import { Provider } from 'urql';

const DEFAULT_SCOPE: GqlScope = { type: 'global' };

interface GraphQLProviderProps {
  /**
   * GraphQL scope for the client. Defaults to global scope for staff-portal.
   *
   * The full GqlScope union is defined for future-proofing, but every call
   * site in the staff-portal uses { type: 'global' }.
   */
  scope?: GqlScope;
  /**
   * Serialized SSR data from route loaders.
   * Merged from all matched routes via useMatches() in root.tsx.
   */
  urqlState?: SSRData;
  children: React.ReactNode;
}

/**
 * Wraps children with a URQL Provider scoped to the given GraphQL endpoint.
 * Restores SSR-prefetched query data into the client cache on mount,
 * so CSR hooks find a cache hit instead of issuing a second network request.
 */
export function GraphQLProvider({
  scope = DEFAULT_SCOPE,
  urqlState,
  children,
}: GraphQLProviderProps) {
  // useMemo with empty deps: create the client once per mount.
  // urqlState is only used during initialization (restoreData is idempotent).
  // scope is captured at mount time — changing scope re-mounts the provider.
  const client = useMemo(() => {
    const ssr = ssrExchange({ isClient: true, initialState: urqlState });
    return createGqlClient(scope, ssr);
  }, []);

  return <Provider value={client}>{children}</Provider>;
}
