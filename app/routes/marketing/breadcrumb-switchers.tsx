import { type BreadcrumbSwitcherOption } from '@/components/breadcrumb';
import { contactGroupRoutes, contactRoutes } from '@/utils/config/routes.config';
import { Trans } from '@lingui/react/macro';

export const marketingSectionSwitcher: BreadcrumbSwitcherOption[] = [
  { label: <Trans>Contacts</Trans>, path: contactRoutes.list() },
  { label: <Trans>Contact Groups</Trans>, path: contactGroupRoutes.list() },
];
