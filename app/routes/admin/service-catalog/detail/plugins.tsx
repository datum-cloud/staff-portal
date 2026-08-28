/**
 * Service-scoped plugin mount — the portal's permanent catch-all for
 * service-context plugin tabs (`portal.page/service` extensions), at
 * `/admin/service-catalog/:name/plugins/:slug/*`. One static route; plugin
 * content resolves inside it at runtime, mirroring
 * `app/routes/customer/project/detail/plugins.tsx`'s project-scoped mount.
 *
 * The server `loader` resolves `slug` against the plugins registered for
 * *this* service (`getPluginsForService(name)`) — not `getPlugin(slug)`
 * alone — so a plugin can't be reached under a service's URL it doesn't
 * declare `serviceRef` for, even if the slug happens to be valid elsewhere.
 */
import type { Route } from './+types/plugins';
import { ServicePluginOutlet } from '@/modules/plugins/client/service-plugin-outlet';
import { getPluginsForService, toPublicPlugin } from '@/modules/plugins/server';
import { NotFoundError } from '@/utils/errors/http';
import { metaObject } from '@/utils/helpers/meta.helper';
import { useLoaderData } from 'react-router';

export const loader = async ({ params }: Route.LoaderArgs) => {
  const { name, slug } = params;
  if (!name || !slug) {
    throw new NotFoundError('Plugin not found');
  }

  const entry = getPluginsForService(name).find((e) => e.spec.slug === slug);
  const plugin = entry ? toPublicPlugin(entry) : null;
  if (!plugin) {
    throw new NotFoundError('Plugin not found');
  }

  return { plugin };
};

export const meta: Route.MetaFunction = ({ data }) => {
  return metaObject(data?.plugin.displayName ?? 'Plugin');
};

export default function ServicePluginMount() {
  const { plugin } = useLoaderData<typeof loader>();
  return <ServicePluginOutlet plugin={plugin} />;
}
