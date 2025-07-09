import { meta } from "@/utils/config/meta.config";
import type {
  ClientLoaderFunction,
  LoaderFunction,
  MetaDescriptor,
  MetaFunction,
  RouteMatch,
  RouteObject,
} from "react-router";

type RouteMatchMeta = {
  meta?: MetaDescriptor[];
};

type CreateMetaArgs = {
  matches: RouteMatchMeta[];
  location: Location;
  params: Record<string, string>;
  data?: any;
};

/**
 * Merging helper
 *
 * {@link https://remix.run/docs/en/main/route/meta#meta-merging-helper}
 *
 * If you can't avoid the merge problem with global meta or index routes, we've created
 * a helper that you can put in your app that can override and append to parent meta easily.
 *
 * @example
 * ```typescript
 * import type { MetaFunction } from 'react-router';
 *
 * import { mergeMeta } from '~/utils/meta';
 *
 * export const meta: MetaFunction<typeof loader> = mergeMeta(({ data }) => {
 *   return [
 *     { title: "My Leaf Route" },
 *   ];
 * });
 *
 * // In a parent route:
 * import type { MetaFunction } from 'react-router';
 *
 * export const meta: MetaFunction<typeof loader> = ({ data }) => {
 *   return [
 *     { title: "My Parent Route" },
 *     { name: 'description', content: "This is the parent route" },
 *   ];
 * }
 * ```
 * The resulting meta will contain both `title: 'My Leaf Route'` and `description: 'This is the parent route'`.
 */
export function mergeMeta<
  Loader extends LoaderFunction | ClientLoaderFunction | unknown = unknown,
  ParentsLoaders extends Record<
    string,
    LoaderFunction | ClientLoaderFunction | unknown
  > = Record<string, unknown>,
>(
  leafMetaFn: MetaFunction<Loader, ParentsLoaders>,
): MetaFunction<Loader, ParentsLoaders> {
  return (args) => {
    const leafMeta = leafMetaFn(args);

    return args.matches.reduceRight((acc, match) => {
      for (const parentMeta of match.meta) {
        addUniqueMeta(acc, parentMeta);
      }

      return acc;
    }, leafMeta);
  };
}

/**
 * Merging helper that works with Route Module Type Safety
 *
 * If you can't avoid the merge problem with global meta or index routes, we've created
 * a helper that you can put in your app that can override and append to parent meta easily.
 *
 * @example
 * ```typescript
 * import type { Route } from './+types/leaf';
 *
 * import { mergeRouteModuleMeta } from '~/utils/meta';
 *
 * export const meta: Route.MetaFunction = mergeRouteModuleMeta(({ data }) => {
 *   return [
 *     { title: "My Leaf Route" },
 *   ];
 * });
 *
 * // In a parent route:
 * import type { Route } from './+types/root';
 *
 * export const meta: Route.MetaFunction = ({ data }) => {
 *   return [
 *     { title: "My Parent Route" },
 *     { name: 'description', content: "This is the parent route" },
 *   ];
 * }
 * ```
 * The resulting meta will contain both `title: 'My Leaf Route'` and `description: 'This is the parent route'`.
 */

export function mergeRouteModuleMeta(
  leafMetaFn: (args: CreateMetaArgs) => MetaDescriptor[],
): (args: CreateMetaArgs) => MetaDescriptor[] {
  return (args) => {
    const leafMeta = leafMetaFn(args);

    return args.matches.reduceRight((acc, match) => {
      for (const parentMeta of match.meta ?? []) {
        addUniqueMeta(acc, parentMeta);
      }

      return acc;
    }, leafMeta);
  };
}
function addUniqueMeta(
  acc: MetaDescriptor[] | undefined,
  parentMeta: MetaDescriptor,
) {
  if (acc?.findIndex((meta) => isMetaEqual(meta, parentMeta)) === -1) {
    acc.push(parentMeta);
  }
}

function isMetaEqual(meta1: MetaDescriptor, meta2: MetaDescriptor): boolean {
  // prettier-ignore
  return ('name' in meta1 && 'name' in meta2 && meta1.name === meta2.name) ||
    ('property' in meta1 && 'property' in meta2 && meta1.property === meta2.property) ||
    ('title' in meta1 && 'title' in meta2);
}

export function metaObject(title?: string, description?: string) {
  const formattedTitle = title
    ? `${title} | ${meta.siteTitle}`
    : meta.siteTitle;
  const formattedDescription = description ?? meta.siteDescription;
  const ogImage = `${meta.siteUrl}/og-image.jpg`;

  return [
    { title: formattedTitle },
    { name: "description", content: formattedDescription },
    { property: "og:title", content: formattedTitle },
    { property: "og:description", content: formattedDescription },
    { property: "og:type", content: "website" },
    { property: "og:url", content: meta.siteUrl },
    { property: "og:image", content: ogImage },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: formattedTitle },
    { name: "twitter:description", content: formattedDescription },
    { name: "twitter:image", content: ogImage },
  ];
}

export function extractDataFromMatches<T>(
  matches: any[],
  routeId: string,
): T | undefined {
  const match = matches.find((match) => match?.id === routeId);
  return match?.data as T | undefined;
}
