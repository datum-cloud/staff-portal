import { ServiceDetails } from '../service-details';
import { getServiceDetailMetadata, usePlugins } from '../shared';
import type { Route } from './+types/index';
import {
  getServicePageExtensions,
  isOverviewOverrideExtension,
} from '@/modules/plugins/client/match-extension';
import { ServiceOverviewOverride } from '@/modules/plugins/client/service-overview-override';
import { metaObject } from '@/utils/helpers';
import { useMemo } from 'react';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { displayName } = getServiceDetailMetadata(matches);
  return metaObject(displayName);
};

/**
 * A plugin can replace this whole built-in Overview with its own page (see
 * the reserved `path: ""` convention on `PageServiceExtension`,
 * `../../../../modules/plugins/types.ts`) — checked here, before
 * `ServiceDetails`' own data hooks run, so an overridden service doesn't
 * pay for the `ServiceConfiguration` fetch this built-in view needs and the
 * override doesn't. When overridden, the built-in view is still reachable
 * under "Service details" (`./details.tsx`).
 */
export default function Page() {
  const plugins = usePlugins();

  const override = useMemo(
    () =>
      plugins
        .flatMap((plugin) =>
          getServicePageExtensions(plugin.manifest)
            .filter(isOverviewOverrideExtension)
            .map((extension) => ({ plugin, extension }))
        )
        .at(0),
    [plugins]
  );

  if (override) {
    return <ServiceOverviewOverride plugin={override.plugin} extension={override.extension} />;
  }

  return <ServiceDetails />;
}
