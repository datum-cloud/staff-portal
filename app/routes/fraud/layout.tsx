import { SubLayout } from '@/components/sub-layout';
import { fraudRoutes } from '@/utils/config/routes.config';
import { Trans, useLingui } from '@lingui/react/macro';
import { FileText, ShieldAlert, Truck } from 'lucide-react';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Fraud &amp; Abuse</Trans>,
};

export default function FraudLayout() {
  const { t } = useLingui();

  const menuItems = [
    {
      title: t`Evaluations`,
      href: fraudRoutes.evaluations.list(),
      icon: ShieldAlert,
    },
    {
      title: t`Providers`,
      href: fraudRoutes.providers.list(),
      icon: Truck,
    },
    {
      title: t`Policy`,
      href: fraudRoutes.policy(),
      icon: FileText,
    },
  ];

  return (
    <SubLayout>
      <SubLayout.SidebarLeft>
        <SubLayout.SidebarMenu menuItems={menuItems} />
      </SubLayout.SidebarLeft>
      <SubLayout.Content>
        <Outlet />
      </SubLayout.Content>
    </SubLayout>
  );
}
