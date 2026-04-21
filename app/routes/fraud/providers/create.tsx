import type { Route } from './+types/create';
import { useCreateFraudProviderMutation } from '@/resources/request/client';
import { fraudRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
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
            <Form.Root
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
              {({ isSubmitting, isDirty, isValid }) => (
                <>
                  <Form.Field name="name" label={t`Name`} required>
                    <Form.Input />
                  </Form.Field>
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
                      <Trans>Create</Trans>
                    </Button>
                  </div>
                </>
              )}
            </Form.Root>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
