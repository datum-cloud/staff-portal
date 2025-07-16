import type { Route } from './+types/layout';
import ConfirmDialog from '@/components/confirm-dialog';
import { SubLayout } from '@/components/sub-layout';
import Tooltip from '@/components/tooltip';
import { authenticator } from '@/modules/auth';
import { Button } from '@/modules/shadcn/ui/button';
import { toast } from '@/modules/toast';
import { orgDeleteMutation } from '@/resources/request/client/organization.request';
import { orgDetailQuery } from '@/resources/request/server/organization.request';
import { Organization } from '@/resources/schemas/organization.schema';
import { Trans, useLingui } from '@lingui/react/macro';
import { FileText, Folders, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteOrg = async () => {
    try {
      await orgDeleteMutation(data.metadata.name);

      setDeleteDialogOpen(false);
      navigate('/organizations');

      toast.success(t`Organization deleted successfully`);
    } catch (error) {
      toast.error(t`Failed to delete organization`);
    }
  };

  const menuItems = [
    {
      title: 'Overview',
      href: '',
      icon: FileText,
    },
    {
      title: 'Projects',
      href: './projects',
      icon: Folders,
    },
  ];

  return (
    <>
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t`Delete Organization`}
        description={t`Are you sure you want to delete organization "${data.metadata.name}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={handleDeleteOrg}
        requireConfirmation
      />

      <SubLayout>
        <SubLayout.ActionBar>
          <Tooltip message={<Trans>Delete</Trans>}>
            <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2Icon />
            </Button>
          </Tooltip>
        </SubLayout.ActionBar>
        <SubLayout.SidebarLeft>
          <SubLayout.SidebarMenu menuItems={menuItems} />
        </SubLayout.SidebarLeft>
        <SubLayout.Content>
          <Outlet />
        </SubLayout.Content>
      </SubLayout>
    </>
  );
}
