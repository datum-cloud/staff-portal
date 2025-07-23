import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import CopyButton from '@/components/copy-button';
import DateFormatter from '@/components/date-formatter';
import DeleteActionButton from '@/components/delete-action-button';
import { Text, Title } from '@/components/typography';
import { Card, CardContent } from '@/modules/shadcn/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/modules/shadcn/ui/table';
import { toast } from '@/modules/toast';
import { projectDeleteMutation } from '@/resources/request/client/project.request';
import { Project } from '@/resources/schemas/project.schema';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link, useNavigate, useRouteLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<Project>(matches, 'routes/project/detail/layout');
  return metaObject(`Detail - ${data?.metadata?.annotations?.['kubernetes.io/description']}`);
};

export default function Page() {
  const data = useRouteLoaderData('routes/project/detail/layout') as Project;
  const { t } = useLingui();
  const navigate = useNavigate();

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
    <>
      <AppActionBar>
        <DeleteActionButton
          tooltip={t`Delete Project`}
          itemType="Project"
          description={t`Are you sure you want to delete project "${data.metadata.annotations?.['kubernetes.io/description']}"? This action cannot be undone.`}
          onConfirm={handleDeleteProject}
        />
      </AppActionBar>

      <div className="m-4 flex flex-col gap-1">
        <Title>{data?.metadata?.annotations?.['kubernetes.io/description']}</Title>

        <Card className="mt-4 shadow-none">
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Description</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text>{data?.metadata?.annotations?.['kubernetes.io/description']}</Text>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Name</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text>{data?.metadata?.name}</Text>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Organization</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Link to={`/organizations/${data?.spec?.ownerRef?.name}`}>
                      {data?.spec?.ownerRef?.name}
                    </Link>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Created at</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text>
                      <DateFormatter date={data?.metadata?.creationTimestamp} withTime />
                    </Text>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
