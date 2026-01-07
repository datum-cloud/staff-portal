import { getProjectDetailMetadata, useProjectDetailData } from '../shared';
import type { Route } from './+types/index';
import { DangerZoneCard } from '@/components/danger-zone-card';
import { DateTime } from '@/components/date';
import { Card, CardContent } from '@/modules/shadcn/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/modules/shadcn/ui/table';
import { projectDeleteMutation } from '@/resources/request/client';
import { orgRoutes, projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { toast } from '@datum-ui/toast';
import { Text, Title } from '@datum-ui/typography';
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
    await projectDeleteMutation(project?.metadata?.name ?? '');
    navigate(projectRoutes.list());
    toast.success(t`Project deleted successfully`);
  };

  return (
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
                  <Link to={orgRoutes.detail(organization?.metadata?.name ?? '')}>
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
                    <DateTime date={project?.metadata?.creationTimestamp} variant="both" />
                  </Text>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DangerZoneCard
        deleteTitle={t`Delete Project`}
        deleteDescription={t`Permanently delete this project and all associated data`}
        dialogTitle={t`Delete Project`}
        dialogDescription={t`Are you sure you want to delete project "${project?.metadata?.annotations?.['kubernetes.io/description']} (${project?.metadata?.name ?? ''})"? This action cannot be undone.`}
        onConfirm={handleDeleteProject}
      />
    </div>
  );
}
