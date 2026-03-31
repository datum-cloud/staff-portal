import type { FraudPolicy, FraudPolicySpec } from './types';
import {
  useCreateFraudPolicyMutation,
  useFraudProviderListQuery,
  useUpdateFraudPolicyMutation,
} from '@/resources/request/client';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { PlusCircleIcon, XIcon } from 'lucide-react';
import { z } from 'zod';

const stageSchema = z.object({
  name: z.string().min(1, 'Stage name is required'),
  providers: z.string().min(1, 'At least one provider is required'),
  thresholdReviewScore: z.coerce.number().min(0).max(100),
  thresholdDeactivateScore: z.coerce.number().min(0).max(100),
  required: z.boolean().optional(),
  shortCircuitBelow: z.coerce.number().optional(),
});

const triggerSchema = z.object({
  type: z.enum(['Event', 'Manual']),
  event: z.string().optional(),
});

const policyFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Must be a valid Kubernetes name'),
  enforcementMode: z.enum(['OBSERVE', 'AUTO']),
  maxEntries: z.coerce.number().min(1).default(50),
  triggers: z.array(triggerSchema).optional(),
  stages: z.array(stageSchema).min(1, 'At least one stage is required'),
});

type PolicyFormValues = z.infer<typeof policyFormSchema>;

function policyToFormValues(policy: FraudPolicy): PolicyFormValues {
  return {
    name: policy.metadata?.name ?? '',
    enforcementMode: policy.spec.enforcement.mode,
    maxEntries: policy.spec.historyRetention?.maxEntries ?? 50,
    triggers: policy.spec.triggers?.map((t) => ({
      type: t.type as 'Event' | 'Manual',
      event: t.event,
    })),
    stages: policy.spec.stages.map((s) => ({
      name: s.name,
      providers: s.providers.map((p) => p.providerRef.name).join(', '),
      thresholdReviewScore: s.thresholds.find((t) => t.action === 'REVIEW')?.minScore ?? 50,
      thresholdDeactivateScore: s.thresholds.find((t) => t.action === 'DEACTIVATE')?.minScore ?? 80,
      required: s.required ?? false,
      shortCircuitBelow: s.shortCircuit?.skipWhenBelow,
    })),
  };
}

function formValuesToSpec(values: PolicyFormValues): FraudPolicySpec {
  return {
    enforcement: { mode: values.enforcementMode },
    historyRetention: { maxEntries: values.maxEntries },
    triggers: values.triggers?.filter((t) => t.type).length
      ? values.triggers?.filter((t) => t.type)
      : undefined,
    stages: values.stages.map((s) => ({
      name: s.name,
      providers: s.providers
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((name) => ({ providerRef: { name } })),
      thresholds: [
        { minScore: s.thresholdReviewScore, action: 'REVIEW' as const },
        { minScore: s.thresholdDeactivateScore, action: 'DEACTIVATE' as const },
      ],
      required: s.required || undefined,
      shortCircuit: s.shortCircuitBelow ? { skipWhenBelow: s.shortCircuitBelow } : undefined,
    })),
  };
}

export function PolicyForm({
  policy,
  onCancel,
  onSaved,
}: {
  policy?: FraudPolicy;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const providerListQuery = useFraudProviderListQuery();
  const createPolicyMutation = useCreateFraudPolicyMutation();
  const updatePolicyMutation = useUpdateFraudPolicyMutation();
  const availableProviders = providerListQuery.data?.items ?? [];

  const defaultValues: PolicyFormValues = policy
    ? policyToFormValues(policy)
    : {
        name: 'default',
        enforcementMode: 'OBSERVE',
        maxEntries: 50,
        triggers: [],
        stages: [
          {
            name: 'initial-screening',
            providers: availableProviders
              .map((p) => p.metadata?.name)
              .filter(Boolean)
              .join(', '),
            thresholdReviewScore: 50,
            thresholdDeactivateScore: 80,
            required: true,
            shortCircuitBelow: undefined,
          },
        ],
      };

  const handleSubmit = async (values: PolicyFormValues) => {
    const spec = formValuesToSpec(values);
    if (policy) {
      await updatePolicyMutation.mutateAsync({ name: policy.metadata?.name ?? '', spec });
      toast.success(t`Policy updated successfully`);
    } else {
      await createPolicyMutation.mutateAsync({ name: values.name, spec });
      toast.success(t`Policy created successfully`);
    }
    await onSaved();
  };

  return (
    <Card className="m-4 shadow-none">
      <CardHeader>
        <CardTitle>
          {policy ? <Trans>Edit Fraud Policy</Trans> : <Trans>Create Fraud Policy</Trans>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form.Root
          className="space-y-4"
          schema={policyFormSchema}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}>
          {({ isDirty, isSubmitting, isValid }) => (
            <>
              {!policy && (
                <Form.Field name="name" label={t`Name`} required>
                  <Form.Input />
                </Form.Field>
              )}
              <Form.Field name="enforcementMode" label={t`Enforcement Mode`} required>
                <Form.Select>
                  <Form.SelectItem value="OBSERVE">Observe</Form.SelectItem>
                  <Form.SelectItem value="AUTO">Auto</Form.SelectItem>
                </Form.Select>
              </Form.Field>
              <Form.Field name="maxEntries" label={t`History Retention (max entries)`}>
                <Form.Input type="number" />
              </Form.Field>

              <div className="border-t pt-4">
                <Form.FieldArray name="triggers">
                  {({ fields, append, remove }) => (
                    <>
                      <div className="mb-3 flex items-center justify-between">
                        <Text size="sm" weight="semibold">
                          <Trans>Triggers</Trans>
                        </Text>
                        <Button
                          type="tertiary"
                          theme="outline"
                          size="small"
                          icon={<PlusCircleIcon size={14} />}
                          htmlType="button"
                          onClick={() => append({ type: 'Event', event: '' })}>
                          <Trans>Add Trigger</Trans>
                        </Button>
                      </div>

                      {fields.map((field, idx) => (
                        <div key={field.key} className="mb-3 space-y-3 rounded-lg border p-4">
                          <div className="flex items-center justify-between">
                            <Text size="sm" weight="medium">
                              <Trans>Trigger {idx + 1}</Trans>
                            </Text>
                            <Button
                              type="tertiary"
                              theme="borderless"
                              size="small"
                              icon={<XIcon size={14} />}
                              htmlType="button"
                              onClick={() => remove(idx)}
                            />
                          </div>
                          <Row gutter={[16, 16]}>
                            <Col span={12}>
                              <Form.Field name={`${field.name}.type`} label={t`Type`} required>
                                <Form.Select>
                                  <Form.SelectItem value="Event">Event</Form.SelectItem>
                                  <Form.SelectItem value="Manual">Manual</Form.SelectItem>
                                </Form.Select>
                              </Form.Field>
                            </Col>
                            <Col span={12}>
                              <Form.Field name={`${field.name}.event`} label={t`Event`}>
                                <Form.Select>
                                  <Form.SelectItem value="UserCreated">UserCreated</Form.SelectItem>
                                </Form.Select>
                              </Form.Field>
                            </Col>
                          </Row>
                        </div>
                      ))}
                    </>
                  )}
                </Form.FieldArray>
              </div>

              <div className="border-t pt-4">
                <Form.FieldArray name="stages">
                  {({ fields, append, remove }) => (
                    <>
                      <div className="mb-3 flex items-center justify-between">
                        <Text size="sm" weight="semibold">
                          <Trans>Pipeline Stages</Trans>
                        </Text>
                        <Button
                          type="tertiary"
                          theme="outline"
                          size="small"
                          icon={<PlusCircleIcon size={14} />}
                          htmlType="button"
                          onClick={() =>
                            append({
                              name: '',
                              providers: '',
                              thresholdReviewScore: 50,
                              thresholdDeactivateScore: 80,
                              required: false,
                              shortCircuitBelow: undefined,
                            })
                          }>
                          <Trans>Add Stage</Trans>
                        </Button>
                      </div>

                      {fields.map((field, idx) => (
                        <div key={field.key} className="mb-3 space-y-3 rounded-lg border p-4">
                          <div className="flex items-center justify-between">
                            <Text size="sm" weight="medium">
                              <Trans>Stage {idx + 1}</Trans>
                            </Text>
                            {fields.length > 1 && (
                              <Button
                                type="tertiary"
                                theme="borderless"
                                size="small"
                                icon={<XIcon size={14} />}
                                htmlType="button"
                                onClick={() => remove(idx)}
                              />
                            )}
                          </div>
                          <Form.Field name={`${field.name}.name`} label={t`Stage Name`} required>
                            <Form.Input />
                          </Form.Field>
                          <Form.Field
                            name={`${field.name}.providers`}
                            label={t`Providers (comma-separated)`}
                            required>
                            <Form.Input />
                          </Form.Field>
                          <Row gutter={[16, 16]}>
                            <Col span={12}>
                              <Form.Field
                                name={`${field.name}.thresholdReviewScore`}
                                label={t`Review Threshold`}>
                                <Form.Input type="number" />
                              </Form.Field>
                            </Col>
                            <Col span={12}>
                              <Form.Field
                                name={`${field.name}.thresholdDeactivateScore`}
                                label={t`Deactivate Threshold`}>
                                <Form.Input type="number" />
                              </Form.Field>
                            </Col>
                          </Row>
                          <Row gutter={[16, 16]}>
                            <Col span={12}>
                              <Form.Field name={`${field.name}.required`}>
                                <Form.Checkbox label={t`Required`} />
                              </Form.Field>
                            </Col>
                            <Col span={12}>
                              <Form.Field
                                name={`${field.name}.shortCircuitBelow`}
                                label={t`Short-circuit Below`}>
                                <Form.Input type="number" />
                              </Form.Field>
                            </Col>
                          </Row>
                        </div>
                      ))}
                    </>
                  )}
                </Form.FieldArray>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="tertiary" theme="borderless" htmlType="button" onClick={onCancel}>
                  {t`Cancel`}
                </Button>
                <Button htmlType="submit" disabled={!isDirty || !isValid || isSubmitting}>
                  {policy ? t`Update` : t`Create`}
                </Button>
              </div>
            </>
          )}
        </Form.Root>
      </CardContent>
    </Card>
  );
}
