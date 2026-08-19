/**
 * Platform-wide plugin mount — the portal's permanent catch-all for
 * platform-scoped service plugins (`/plugins/:slug/*`). One static route;
 * plugin content resolves inside it at runtime. Sibling to
 * `app/routes/customer/project/detail/plugins.tsx`'s project-scoped mount,
 * minus the project scoping.
 *
 * The server `loader` resolves `slug` against the registry before any plugin
 * byte reaches the browser and returns only the sanitized `PublicPlugin`.
 */
import type { Route } from './+types/plugins';
import { PluginOutlet } from '@/modules/plugins/client/plugin-outlet';
import { getPlugin, toPublicPlugin } from '@/modules/plugins/server';
import type { PublicPlugin } from '@/modules/plugins/types';
import { NotFoundError } from '@/utils/errors/http';
import { metaObject } from '@/utils/helpers/meta.helper';
import { useLoaderData } from 'react-router';

export const loader = async ({ params }: Route.LoaderArgs) => {
  const { slug } = params;
  if (!slug) {
    throw new NotFoundError('Plugin not found');
  }

  const entry = getPlugin(slug);
  const plugin = entry ? toPublicPlugin(entry) : null;
  if (!plugin) {
    throw new NotFoundError('Plugin not found');
  }

  return { plugin };
};

export const meta: Route.MetaFunction = ({ data }) => {
  return metaObject(data?.plugin.displayName ?? 'Plugin');
};

export const handle = {
  breadcrumb: (data?: { plugin: PublicPlugin }) => data?.plugin.displayName ?? 'Plugin',
};

export default function PluginMount() {
  const { plugin } = useLoaderData<typeof loader>();
  return <PluginOutlet plugin={plugin} />;
}
