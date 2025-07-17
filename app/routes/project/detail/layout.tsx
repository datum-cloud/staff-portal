import type { Route } from './+types/layout';
import DeleteActionButton from '@/components/delete-action-button';
import { SubLayout } from '@/components/sub-layout';
import { authenticator } from '@/modules/auth';
import { toast } from '@/modules/toast';
import { projectDeleteMutation } from '@/resources/request/client/project.request';
import { projectDetailQuery } from '@/resources/request/server/project.request';
import { Project } from '@/resources/schemas/project.schema';
import { useLingui } from '@lingui/react/macro';
import { Outlet, useLoaderData, useNavigate } from 'react-router';

export const handle = {
  breadcrumb: (data: Project) => <span>{data.metadata.name}</span>,
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await projectDetailQuery(session?.accessToken ?? '', params?.projectName ?? '');

  return data;
};

export default function Layout() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const data = useLoaderData() as Project;

  const handleDeleteProject = async () => {
    try {
      await projectDeleteMutation(data.metadata.name);
      navigate('/projects');
      toast.success(t`Project deleted successfully`);
    } catch (error) {
      toast.error(t`Failed to delete project`);
    }
  };

  return (
    <SubLayout>
      <SubLayout.ActionBar>
        <DeleteActionButton
          itemType="Project"
          description={t`Are you sure you want to delete project "${data.metadata.name}"? This action cannot be undone.`}
          onConfirm={handleDeleteProject}
        />
      </SubLayout.ActionBar>
      <SubLayout.Content>
        <Outlet />
      </SubLayout.Content>
    </SubLayout>
  );
}
