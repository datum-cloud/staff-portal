import { getUserDetailMetadata, useUserDetailData } from '../shared';
import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { Button, ButtonCopy } from '@/components/button';
import { DateFormatter } from '@/components/date';
import { DialogConfirm, DialogForm } from '@/components/dialog';
import { Form } from '@/components/form';
import { Text, Title } from '@/components/typography';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/modules/shadcn/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/modules/shadcn/ui/table';
import { toast } from '@/modules/toast';
import { useApp } from '@/providers/app.provider';
import {
  userDeactivateMutation,
  userDeleteMutation,
  userReactivateMutation,
} from '@/resources/request/client';
import { userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';

const deactivateSchema = z.object({
  reason: z.string().min(1, 'Reason is required').min(5, 'Reason must be at least 5 characters'),
});

export const meta: Route.MetaFunction = ({ matches }) => {
  const { userName } = getUserDetailMetadata(matches);
  return metaObject(`Detail - ${userName}`);
};

export default function Page() {
  const { user } = useApp();
  const { t } = useLingui();
  const navigate = useNavigate();
  const data = useUserDetailData();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  const handleDeleteUser = async () => {
    try {
      await userDeleteMutation(data.metadata.name);
      navigate(userRoutes.list());
      toast.success(t`User deleted successfully`);
    } catch (error) {
      toast.error(t`Failed to delete user`);
    }
  };

  const handleDeactivateUser = async (formData: z.infer<typeof deactivateSchema>) => {
    try {
      await userDeactivateMutation({
        apiVersion: 'iam.miloapis.com/v1alpha1',
        kind: 'UserDeactivation',
        metadata: {
          name: data.metadata.name,
        },
        spec: {
          reason: formData.reason,
          deactivatedBy: user?.sub ?? '',
          description: '',
          userRef: {
            name: data.metadata.name,
          },
        },
      });
      toast.success(t`User deactivated successfully`);
    } catch (error) {
      throw error; // Re-throw to keep dialog open
    }
  };

  const handleReactivateUser = async () => {
    setIsReactivating(true);
    try {
      await userReactivateMutation(data.metadata.name);
      toast.success(t`User reactivated successfully`);
      setIsReactivating(false);
    } catch {
      setIsReactivating(false);
    }
  };

  return (
    <>
      <DialogConfirm
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t`Delete User`}
        description={t`Are you sure you want to delete user "${data.spec.givenName} ${data.spec.familyName}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={handleDeleteUser}
        requireConfirmation
      />

      <DialogForm
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        title={t`Deactivate User`}
        description={t`Please provide a reason for deactivating "${data.spec.givenName} ${data.spec.familyName}".`}
        submitText={t`Deactivate`}
        cancelText={t`Cancel`}
        onSubmit={handleDeactivateUser}
        schema={deactivateSchema}
        defaultValues={{ reason: '' }}>
        <Form.Input
          field="reason"
          label={t`Reason for deactivation`}
          placeholder={t`Enter reason for deactivation...`}
          required
        />
      </DialogForm>

      <div className="m-4 flex flex-col gap-1">
        <Title>
          {data?.spec?.givenName} {data?.spec?.familyName}
        </Title>
        <Text textColor="muted">{data?.spec?.email}</Text>

        <Card className="mt-4 shadow-none">
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>ID</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Text>{data?.metadata?.name}</Text>
                      <ButtonCopy value={data?.metadata?.name} />
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Full Name</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text>
                      {data?.spec?.givenName} {data?.spec?.familyName}
                    </Text>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Email</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text>{data?.spec?.email}</Text>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Status</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <BadgeState state={data?.status?.state ?? 'Active'} />
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
                      <DateFormatter date={data?.metadata?.creationTimestamp} withTime />
                    </Text>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 mt-4 shadow-none">
          <CardHeader>
            <CardTitle className="text-destructive">
              <Trans>Danger Zone</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>Irreversible and destructive actions</Trans>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="border-border flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Title level={6} weight="medium">
                    {data?.status?.state === 'Inactive' ? (
                      <Trans>Reactivate User</Trans>
                    ) : (
                      <Trans>Deactivate User</Trans>
                    )}
                  </Title>
                  <Text textColor="muted" size="sm" as="p">
                    {data?.status?.state === 'Inactive' ? (
                      <Trans>Re-enable this user&apos;s access</Trans>
                    ) : (
                      <Trans>Temporarily disable this user&apos;s access</Trans>
                    )}
                  </Text>
                </div>
                <Button
                  type="danger"
                  theme="outline"
                  size="small"
                  loading={isReactivating}
                  onClick={() =>
                    data?.status?.state === 'Inactive'
                      ? handleReactivateUser()
                      : setDeactivateDialogOpen(true)
                  }>
                  {data?.status?.state === 'Inactive' ? (
                    <Trans>Reactivate</Trans>
                  ) : (
                    <Trans>Deactivate</Trans>
                  )}
                </Button>
              </div>

              <div className="border-destructive bg-destructive/5 flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Title level={6} weight="medium" className="text-destructive">
                    <Trans>Delete User</Trans>
                  </Title>
                  <Text textColor="muted" size="sm" as="p">
                    <Trans>Permanently delete this user and all associated data</Trans>
                  </Text>
                </div>
                <Button
                  type="danger"
                  theme="outline"
                  size="small"
                  onClick={() => setDeleteDialogOpen(true)}>
                  <Trans>Delete</Trans>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
