import type { Route } from './+types/detail';
import { DialogConfirm } from '@/components/dialog';
import {
  useDeleteFraudProviderMutation,
  useFraudProviderDetailQuery,
  useUpdateFraudProviderMutation,
} from '@/resources/request/client';
import { fraudRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { z } from 'zod';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Edit Fraud Provider`);
};

const providerSchema = z.object({
  type: z.enum(['maxmind']),
  failurePolicy: z.enum(['FailOpen', 'FailClosed']),
  endpoint: z.string().optional(),
  credentialsRefName: z.string().optional(),
  credentialsRefNamespace: z.string().optional(),
  accountIDKey: z.string().optional(),
  licenseKeyKey: z.string().optional(),
});

type ProviderFormValues = z.infer<typeof providerSchema>;

export default function Page() {
  const navigate = useNavigate();
  const { providerName } = useParams();
  const providerQuery = useFraudProviderDetailQuery(providerName ?? '');
  const provider = providerQuery.data;
  const [showDelete, setShowDelete] = useState(false);
  const updateProviderMutation = useUpdateFraudProviderMutation();
  const deleteProviderMutation = useDeleteFraudProviderMutation();

  if (providerQuery.isLoading) {
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex items-center justify-center py-12">
          <Text size="sm" textColor="muted">
            <Trans>Loading provider...</Trans>
          </Text>
        </CardContent>
      </Card>
    );
  }

  if (!provider) {
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex items-center justify-center py-12">
          <Text size="sm" textColor="muted">
            <Trans>Provider not found.</Trans>
          </Text>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (values: ProviderFormValues) => {
    await updateProviderMutation.mutateAsync({
      name: providerName ?? '',
      spec: {
        type: values.type,
        failurePolicy: values.failurePolicy,
        config: {
          endpoint: values.endpoint || undefined,
          credentialsRef: values.credentialsRefName
            ? {
                name: values.credentialsRefName,
                namespace: values.credentialsRefNamespace || undefined,
                accountIDKey: values.accountIDKey || undefined,
                licenseKeyKey: values.licenseKeyKey || undefined,
              }
            : undefined,
        },
      },
    });
    toast.success(t`Provider updated successfully`);
  };

  return (
    <div className="m-4">
      <div className="mx-auto max-w-2xl">
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{provider.metadata?.name}</CardTitle>
              <Button
                type="danger"
                theme="outline"
                icon={<Trash2Icon size={16} />}
                onClick={() => setShowDelete(true)}>
                <Trans>Delete</Trans>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Form.Root
              className="space-y-4"
              schema={providerSchema}
              defaultValues={{
                type: provider.spec.type,
                failurePolicy: provider.spec.failurePolicy ?? 'FailOpen',
                endpoint: provider.spec.config?.endpoint ?? '',
                credentialsRefName: provider.spec.config?.credentialsRef?.name ?? '',
                credentialsRefNamespace: provider.spec.config?.credentialsRef?.namespace ?? '',
                accountIDKey: provider.spec.config?.credentialsRef?.accountIDKey ?? '',
                licenseKeyKey: provider.spec.config?.credentialsRef?.licenseKeyKey ?? '',
              }}
              onSubmit={handleSubmit}>
              {({ isSubmitting, isDirty, isValid }) => (
                <>
                  <Form.Field name="type" label={t`Provider Type`} required>
                    <Form.Select>
                      <Form.SelectItem value="maxmind">MaxMind</Form.SelectItem>
                    </Form.Select>
                  </Form.Field>
                  <Form.Field name="failurePolicy" label={t`Failure Policy`} required>
                    <Form.Select>
                      <Form.SelectItem value="FailOpen">Fail Open</Form.SelectItem>
                      <Form.SelectItem value="FailClosed">Fail Closed</Form.SelectItem>
                    </Form.Select>
                  </Form.Field>
                  <Form.Field name="endpoint" label={t`Endpoint`}>
                    <Form.Input />
                  </Form.Field>
                  <div className="border-t pt-4">
                    <Text size="sm" weight="medium" className="mb-3">
                      <Trans>Credentials Reference</Trans>
                    </Text>
                    <div className="space-y-4">
                      <Form.Field name="credentialsRefName" label={t`Secret Name`}>
                        <Form.Input />
                      </Form.Field>
                      <Form.Field name="credentialsRefNamespace" label={t`Secret Namespace`}>
                        <Form.Input />
                      </Form.Field>
                      <Form.Field name="accountIDKey" label={t`Account ID Key`}>
                        <Form.Input />
                      </Form.Field>
                      <Form.Field name="licenseKeyKey" label={t`License Key Key`}>
                        <Form.Input />
                      </Form.Field>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="tertiary"
                      theme="borderless"
                      htmlType="button"
                      onClick={() => navigate(fraudRoutes.providers.list())}>
                      {t`Cancel`}
                    </Button>
                    <Button
                      htmlType="submit"
                      disabled={!isDirty || !isValid || isSubmitting}
                      loading={isSubmitting}>
                      <Trans>Update</Trans>
                    </Button>
                  </div>
                </>
              )}
            </Form.Root>
          </CardContent>
        </Card>
      </div>

      <DialogConfirm
        open={showDelete}
        onOpenChange={setShowDelete}
        title={t`Delete Provider`}
        description={t`Are you sure you want to delete provider "${provider.metadata?.name ?? ''}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={async () => {
          await deleteProviderMutation.mutateAsync(provider.metadata?.name ?? '');
          toast.success(t`Provider deleted successfully`);
          navigate(fraudRoutes.providers.list());
        }}
      />
    </div>
  );
}
