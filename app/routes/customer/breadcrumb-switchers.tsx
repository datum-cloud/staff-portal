import { type BreadcrumbSwitcherOption } from '@/components/breadcrumb';
import {
  billingAccountRoutes,
  fraudRoutes,
  orgRoutes,
  projectRoutes,
  resourceRoutes,
  userRoutes,
} from '@/utils/config/routes.config';
import { Trans } from '@lingui/react/macro';

export const customerSectionSwitcher: BreadcrumbSwitcherOption[] = [
  { label: <Trans>Users</Trans>, path: userRoutes.list() },
  { label: <Trans>Organizations</Trans>, path: orgRoutes.list() },
  { label: <Trans>Projects</Trans>, path: projectRoutes.list() },
  { label: <Trans>Resources</Trans>, path: resourceRoutes.root() },
  { label: <Trans>Billing Accounts</Trans>, path: billingAccountRoutes.list() },
  { label: <Trans>Fraud &amp; Abuse</Trans>, path: fraudRoutes.root() },
];
