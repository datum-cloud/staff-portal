import { SubLayout } from '@/components/sub-layout';
import { profileRoutes } from '@/utils/config/routes.config';
import { Trans, useLingui } from '@lingui/react/macro';
import { KeyIcon, SettingsIcon } from 'lucide-react';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>My Profile</Trans>,
};

export default function Layout() {
  const { t } = useLingui();

  const menuItems = [
    {
      title: t`Settings`,
      href: profileRoutes.settings(),
      icon: SettingsIcon,
    },
    {
      title: t`Active Sessions`,
      href: profileRoutes.sessions(),
      icon: KeyIcon,
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
