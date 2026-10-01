# `resources/gql` — the GraphQL operations layer

This folder holds every GraphQL **operation** (field selection) the app sends to the
gateway. It's the GraphQL peer of `resources/openapi/` — the difference is that
GraphQL selections are hand-authored, so they live here instead of being
generated.

If you're adding or changing anything that reads from the gateway, you work
here. Follow the rules below; a couple of them are enforced by lint.

## Where it sits

```
modules/graphql/generated/**    genql codegen (the schema as TS) — never hand-edited
modules/graphql/client.ts       urql client + runGqlQuery + GqlResult (the primitives)
resources/gql/<resource>.gql.ts  ← YOU ARE HERE: ops (inline selections) + Gql* types
resources/request/client/apis/*  api fns call the ops, map/shape, hand back domain data
resources/request/client/queries/* React Query hooks
route / component                call a hook; import Gql* types from resources/gql
```

Full architecture context: `docs/engineering/04-data-and-requests.md`.

## The two hard rules (lint-enforced)

1. **`runGqlQuery` is only imported here** (`resources/gql/*.gql.ts`). The api
   layer calls the ops you export — it never calls `runGqlQuery` itself.
2. **`generateQueryOp` is only used inside `client.ts`** (wrapped by
   `runGqlQuery`). You never touch the raw genql builder.

Everything above the api layer (queries, components, routes) calls a React Query
hook — never an op or `runGqlQuery` directly.

## Writing an op

An op is an arrow function that calls `runGqlQuery(name, request)` with its field
**selection inline** — so the whole request reads top-to-bottom at a glance (no
hunting for a hoisted `const`). `runGqlQuery` returns the result **typed from the
selection** (via `FieldsSelection`), so you never get `any` and never cast.

```ts
import { runGqlQuery } from '@/modules/graphql/client';

export const projectsOp = (params: { limit?: number; cursor?: string; search?: string }) =>
  runGqlQuery('StaffProjects', {
    projects: [
      { limit: params.limit ?? null, cursor: params.cursor ?? null, search: params.search ?? null },
      {
        items: { name: true, displayName: true, state: true /* …fields inline… */ },
        continueToken: true,
      },
    ],
  });
```

- **Name** (`'StaffProjects'`): the operation name the gateway traces. Always set
  it — unnamed ops trace as `Anonymous`. Convention: `Staff<Thing>`.
- **Selections are inline, even when repeated.** We duplicate a selection across
  two ops rather than share a `const`, because readability of the request wins.
  (If a selection is genuinely shared and large, a `const` co-located in the same
  `.gql.ts` is acceptable — never one imported from another module.)
- **Op naming**: `<thing>Op` (e.g. `projectsOp`, `organizationMembersOp`).

## Typing the result: pass-through vs. transform

This is the one decision to get right.

### Pass-through — the api returns the rows as-is → **derive** the type

Don't re-declare an interface; derive it from the op with `GqlResult`. The
selection is then the single source of truth, and there's nothing to cast.

```ts
import { runGqlQuery, type GqlResult } from '@/modules/graphql/client';

export const projectsOp = (/* … */) =>
  runGqlQuery('StaffProjects', {
    projects: [
      /* … */
    ],
  });

export type GqlProject = NonNullable<
  NonNullable<GqlResult<typeof projectsOp>['projects']>['items']
>[number];
```

The api fn is then trivial and cast-free:

```ts
export const listProjects = async (params?: { limit?; cursor?; search? }) => {
  const data = await projectsOp(params ?? {});
  return {
    items: data?.projects?.items ?? [],
    continueToken: data?.projects?.continueToken ?? null,
  };
};
```

### Transform — the api reshapes the response → **hand-write** the `Gql*` type

Only when the api genuinely restructures the data (adds derived fields, flattens,
renests) do you hand-write the domain interface. The mapper's return type _is_
that interface, so there's still no cast at the call site.

```ts
// resources/gql/organization.gql.ts
export interface GqlOrganization {
  /* …derived onboardingStatus, entityType, counts… */
}
```

```ts
// organization.api.ts
export const mapGqlOrganization = (org: GqlOrganizationFields): GqlOrganization => ({ /* … */ });
export const listOrganizations = async (p?) => {
  const data = await organizationsOp(p ?? {});
  return { items: (data?.organizations?.items ?? []).map(mapGqlOrganization), continueToken: … };
};
```

> If you find yourself writing `as GqlX` in an api fn, stop: it's a pass-through
> that should derive its type, or a transform whose mapper return type should be
> `GqlX`. A cast is only legitimate at a transform boundary that narrows a gateway
> `string` to a domain union, or asserts an intentional partial.

## Conventions

- **Types are named `Gql<Thing>`** (`GqlProject`, `GqlUser`, `GqlSession`, …) — the
  marker that says "gateway response shape", distinct from the `ComMiloapis*` REST
  types. No `Enriched*` / `Extended*` — standardize on the `Gql` prefix.
- **Consumers import `Gql*` types directly from `resources/gql/<resource>.gql.ts`**
  (not re-exported through the api, not through a barrel).
- **Return-type annotations match REST**: lists **infer** (no annotation);
  nullable gets **annotate** `Promise<GqlX | null>`.
- **api fns are arrow consts** (`export const xQuery = async (…) => {…}`), like the
  REST ones.

## Checklist: add a new gateway-backed read

1. Whitelist the query in `graphql.config.json`, then `bun run scripts/graphql.ts`
   and commit the regenerated `modules/graphql/generated/**` (prettier-formatted).
2. Add `xxxOp` here with the selection inline + the `Gql*` type
   (derive it for pass-through, hand-write it for a transform).
3. Add the api fn in `apis/<resource>.api.ts`: `await xxxOp(args)`, then return
   as-is or map.
4. Add the hook in `queries/<resource>.queries.ts`.
5. Consume via the hook; import `Gql*` types from here.
6. `tsc --noEmit`, `eslint`, `bun test` — all green.
