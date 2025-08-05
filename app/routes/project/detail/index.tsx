import { useProjectDetailData, getProjectDetailMetadata } from '../shared';
import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { ButtonDeleteAction } from '@/components/button';
import { ButtonCopy } from '@/components/button';
import { DateFormatter } from '@/components/date';
import { Text, Title } from '@/components/typography';
import { Card, CardContent } from '@/modules/shadcn/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/modules/shadcn/ui/table';
import { toast } from '@/modules/toast';
import { projectDeleteMutation } from '@/resources/request/client';
import { projectRoutes, orgRoutes } from '@/utils/config/routes.config';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link, useNavigate } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Detail - ${projectName}`);
};

export default function Page() {
  const { project, organization } = useProjectDetailData();
  const { t } = useLingui();
  const navigate = useNavigate();

  const handleDeleteProject = async () => {
    try {
      await projectDeleteMutation(project.metadata.name);
      navigate(projectRoutes.list());
      toast.success(t`Project deleted successfully`);
    } catch (error) {
      toast.error(t`Failed to delete project`);
    }
  };

  return (
    <>
      <AppActionBar>
        <ButtonDeleteAction
          tooltip={t`Delete Project`}
          itemType="Project"
          description={t`Are you sure you want to delete project "${project.metadata.annotations?.['kubernetes.io/description']} (${project.metadata.name})"? This action cannot be undone.`}
          onConfirm={handleDeleteProject}
        />
      </AppActionBar>

      <div className="m-4 flex flex-col gap-1">
        <Title>{project?.metadata?.annotations?.['kubernetes.io/description']}</Title>

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
                    <Text>{project?.metadata?.annotations?.['kubernetes.io/description']}</Text>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Name</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text>{project?.metadata?.name}</Text>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Organization</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Link to={orgRoutes.detail(organization?.metadata?.name)}>
                      {organization?.metadata?.annotations?.['kubernetes.io/display-name']}
                    </Link>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Created</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text>
                      <DateFormatter date={project?.metadata?.creationTimestamp} withTime />
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
