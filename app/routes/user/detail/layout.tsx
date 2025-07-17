import type { Route } from './+types/layout';
import ConfirmDialog from '@/components/confirm-dialog';
import { SubLayout } from '@/components/sub-layout';
import Tooltip from '@/components/tooltip';
import { authenticator } from '@/modules/auth';
import { Button } from '@/modules/shadcn/ui/button';
import { toast } from '@/modules/toast';
import { userDeleteMutation } from '@/resources/request/client/user.request';
import { userDetailQuery } from '@/resources/request/server/user.request';
import { User } from '@/resources/schemas/user.schema';
import { Trans, useLingui } from '@lingui/react/macro';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Outlet, useLoaderData, useNavigate } from 'react-router';

export const handle = {
  breadcrumb: (data: User) => (
    <span>
      {data.spec.givenName} {data.spec.familyName}
    </span>
  ),
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await userDetailQuery(session?.accessToken ?? '', params?.userId ?? '');

  return data;
};

export default function Layout() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const data = useLoaderData() as User;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteOrg = async () => {
    try {
      await userDeleteMutation(data.metadata.name);

      setDeleteDialogOpen(false);
      navigate('/users');

      toast.success(t`User deleted successfully`);
    } catch (error) {
      toast.error(t`Failed to delete user`);
    }
  };

  return (
    <>
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t`Delete User`}
        description={t`Are you sure you want to delete user "${data.metadata.name}"? This action cannot be undone.`}
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
        <SubLayout.Content>
          <Outlet />
        </SubLayout.Content>
      </SubLayout>
    </>
  );
}
