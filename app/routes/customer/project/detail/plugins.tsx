/**
 * Project-scoped plugin mount — the portal's permanent catch-all for
 * project-context service plugins
 * (`/customers/projects/:projectName/plugins/:slug/*`). One static route;
 * plugin content resolves inside it at runtime, mirroring cloud-portal's
 * `app/routes/project/detail/services/plugin-mount.tsx`.
 *
 * The server `loader` resolves `slug` against the registry before any plugin
 * byte reaches the browser and returns only the sanitized `PublicPlugin`.
 * staff-portal has no project-entitlement or RBAC-gate modules yet (unlike
 * cloud-portal's plugin-mount, which checks both) — `getPlugin` already
 * fails closed for unknown/suspended/not-Ready plugins, which is enough for
 * v1; add entitlement/RBAC gating here if a future plugin page needs it.
 */
import type { Route } from './+types/plugins';
import { ProjectPluginOutlet } from '@/modules/plugins/client/project-plugin-outlet';
import { getPlugin, toPublicPlugin } from '@/modules/plugins/server';
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

export default function ProjectPluginMount() {
  const { plugin } = useLoaderData<typeof loader>();
  return <ProjectPluginOutlet plugin={plugin} />;
}
