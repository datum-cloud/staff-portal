import type { Route } from './+types/create';
import { useCreateFraudProviderMutation } from '@/resources/request/client';
import { fraudRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Form } from '@datum-ui/form';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useNavigate } from 'react-router';
import { z } from 'zod';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Create Fraud Provider`);
};

const providerSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Must be a valid Kubernetes name'),
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
  const createProviderMutation = useCreateFraudProviderMutation();

  const handleSubmit = async (values: ProviderFormValues) => {
    await createProviderMutation.mutateAsync({
      name: values.name,
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
    toast.success(t`Provider created successfully`);
    navigate(fraudRoutes.providers.list());
  };

  return (
    <div className="m-4">
      <div className="mx-auto max-w-2xl">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>
              <Trans>Create Fraud Provider</Trans>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form
              className="space-y-4"
              schema={providerSchema}
              defaultValues={{
                name: '',
                type: 'maxmind',
                failurePolicy: 'FailOpen',
                endpoint: '',
                credentialsRefName: '',
                credentialsRefNamespace: '',
                accountIDKey: '',
                licenseKeyKey: '',
              }}
              onSubmit={handleSubmit}>
              {(form) => (
                <>
                  <Form.Input field="name" label={t`Name`} required />
                  <Form.Select
                    field="type"
                    label={t`Provider Type`}
                    required
                    options={[{ label: 'MaxMind', value: 'maxmind' }]}
                  />
                  <Form.Select
                    field="failurePolicy"
                    label={t`Failure Policy`}
                    required
                    options={[
                      { label: 'Fail Open', value: 'FailOpen' },
                      { label: 'Fail Closed', value: 'FailClosed' },
                    ]}
                  />
                  <Form.Input field="endpoint" label={t`Endpoint`} />
                  <div className="border-t pt-4">
                    <Text size="sm" weight="medium" className="mb-3">
                      <Trans>Credentials Reference</Trans>
                    </Text>
                    <div className="space-y-4">
                      <Form.Input field="credentialsRefName" label={t`Secret Name`} />
                      <Form.Input field="credentialsRefNamespace" label={t`Secret Namespace`} />
                      <Form.Input field="accountIDKey" label={t`Account ID Key`} />
                      <Form.Input field="licenseKeyKey" label={t`License Key Key`} />
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
                    <Button htmlType="submit" disabled={!form.formState.isDirty}>
                      <Trans>Create</Trans>
                    </Button>
                  </div>
                </>
              )}
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
