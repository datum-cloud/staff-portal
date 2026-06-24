// Shared by axios.server.ts (writes) and graphql/client.ts (reads).
// A single definition prevents silent breakage from string drift.
export const REQUEST_CONTEXT_STORE_KEY = '__request_context_store__';
