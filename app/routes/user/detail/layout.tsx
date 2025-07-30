import type { Route } from './+types/layout';
import { ButtonDeleteAction } from '@/components/button';
import { SubLayout } from '@/components/sub-layout';
import { authenticator } from '@/modules/auth';
import { toast } from '@/modules/toast';
import { userDeleteMutation } from '@/resources/request/client/user.request';
import { userDetailQuery } from '@/resources/request/server/user.request';
import { User } from '@/resources/schemas/user.schema';
import { userRoutes } from '@/utils/config/routes.config';
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
      navigate(userRoutes.list());
      toast.success(t`User deleted successfully`);
    } catch (error) {
      toast.error(t`Failed to delete user`);
    }
  };

  return (
    <SubLayout>
      <SubLayout.ActionBar>
        <ButtonDeleteAction
          itemType="User"
          description={t`Are you sure you want to delete user "${data.spec.givenName} ${data.spec.familyName}"? This action cannot be undone.`}
          onConfirm={handleDeleteUser}
        />
      </SubLayout.ActionBar>
      <SubLayout.Content>
        <Outlet />
      </SubLayout.Content>
    </SubLayout>
  );
}
