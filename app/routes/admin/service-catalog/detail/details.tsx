/**
 * "Service details": the built-in Overview content, for services whose
 * Overview a plugin has replaced (see `./index.tsx`). The left nav only links
 * here when there is such an override (`./layout.tsx`), but the page works
 * for any service.
 */
import { ServiceDetails } from '../service-details';
import { getServiceDetailMetadata } from '../shared';
import type { Route } from './+types/details';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const handle = {
  breadcrumb: () => <Trans>Service details</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { displayName } = getServiceDetailMetadata(matches);
  return metaObject(`Service details - ${displayName}`);
};

export default function Page() {
  return <ServiceDetails />;
}
