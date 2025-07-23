import type { Route } from './+types/layout';
import DeleteActionButton from '@/components/delete-action-button';
import { SubLayout } from '@/components/sub-layout';
import { authenticator } from '@/modules/auth';
import { toast } from '@/modules/toast';
import { orgDeleteMutation } from '@/resources/request/client/organization.request';
import { orgDetailQuery } from '@/resources/request/server/organization.request';
import { Organization } from '@/resources/schemas/organization.schema';
import { useLingui } from '@lingui/react/macro';
import { FileText, Folders } from 'lucide-react';
import { Outlet, useLoaderData, useNavigate } from 'react-router';

export const handle = {
  breadcrumb: (data: Organization) => (
    <span>{data.metadata.annotations?.['kubernetes.io/display-name']}</span>
  ),
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await orgDetailQuery(session?.accessToken ?? '', params?.orgName ?? '');

  return data;
};

export default function Layout() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const data = useLoaderData() as Organization;

  const handleDeleteOrganization = async () => {
    try {
      await orgDeleteMutation(data.metadata.name);
      navigate('/organizations');
      toast.success(t`Organization deleted successfully`);
    } catch (error) {
      toast.error(t`Failed to delete organization`);
    }
  };

  const menuItems = [
    {
      title: t`Overview`,
      href: `/organizations/${data.metadata.name}`,
      icon: FileText,
    },
    {
      title: t`Projects`,
      href: `/organizations/${data.metadata.name}/projects`,
      icon: Folders,
    },
  ];

  return (
    <SubLayout>
      <SubLayout.ActionBar>
        <DeleteActionButton
          itemType="Organization"
          description={t`Are you sure you want to delete organization "${data.metadata.name}"? This action cannot be undone.`}
          onConfirm={handleDeleteOrganization}
        />
      </SubLayout.ActionBar>
      <SubLayout.SidebarLeft>
        <SubLayout.SidebarMenu menuItems={menuItems} />
      </SubLayout.SidebarLeft>
      <SubLayout.Content>
        <Outlet />
      </SubLayout.Content>
    </SubLayout>
  );
}
