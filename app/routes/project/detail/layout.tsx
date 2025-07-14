import type { Route } from './+types/layout';
import { SubLayout } from '@/components/sub-layout';
import { authenticator } from '@/modules/auth/auth.server';
import { projectDetailQuery } from '@/resources/request/server/project.request';
import { Project } from '@/resources/schemas/project.schema';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: (data: Project) => <span>{data.metadata.name}</span>,
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await projectDetailQuery(session?.accessToken ?? '', params?.projectName ?? '');

  return data;
};

export default function Layout() {
  return (
    <SubLayout>
      <SubLayout.Content>
        <Outlet />
      </SubLayout.Content>
    </SubLayout>
  );
}
