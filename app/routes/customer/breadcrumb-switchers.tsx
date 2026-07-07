import { type BreadcrumbSwitcherOption } from '@/components/breadcrumb';
import { orgRoutes, projectRoutes, userRoutes } from '@/utils/config/routes.config';
import { Trans } from '@lingui/react/macro';

export const customerSectionSwitcher: BreadcrumbSwitcherOption[] = [
  { label: <Trans>Users</Trans>, path: userRoutes.list() },
  { label: <Trans>Organizations</Trans>, path: orgRoutes.list() },
  { label: <Trans>Projects</Trans>, path: projectRoutes.list() },
];
