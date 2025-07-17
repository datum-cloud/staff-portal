import type { Route } from './+types/layout';
import DeleteActionButton from '@/components/delete-action-button';
import { SubLayout } from '@/components/sub-layout';
import { authenticator } from '@/modules/auth';
import { toast } from '@/modules/toast';
import { userDeleteMutation } from '@/resources/request/client/user.request';
import { userDetailQuery } from '@/resources/request/server/user.request';
import { User } from '@/resources/schemas/user.schema';
import { useLingui } from '@lingui/react/macro';
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

  const handleDeleteUser = async () => {
    try {
      await userDeleteMutation(data.metadata.name);
      navigate('/users');
      toast.success(t`User deleted successfully`);
    } catch (error) {
      toast.error(t`Failed to delete user`);
    }
  };

  return (
    <SubLayout>
      <SubLayout.ActionBar>
        <DeleteActionButton
          itemType="User"
          description={t`Are you sure you want to delete user "${data.metadata.name}"? This action cannot be undone.`}
          onConfirm={handleDeleteUser}
        />
      </SubLayout.ActionBar>
      <SubLayout.Content>
        <Outlet />
      </SubLayout.Content>
    </SubLayout>
  );
}
