import type { FraudPolicy, FraudPolicySpec } from './types';
import {
  useCreateFraudPolicyMutation,
  useFraudProviderListQuery,
  useUpdateFraudPolicyMutation,
} from '@/resources/request/client';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Form } from '@datum-ui/form';
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
        <Form
          className="space-y-4"
          schema={policyFormSchema}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}>
          {(form) => {
            const stages = form.watch('stages');

            return (
              <>
                {!policy && <Form.Input field="name" label={t`Name`} required />}
                <Form.Select
                  field="enforcementMode"
                  label={t`Enforcement Mode`}
                  required
                  options={[
                    { label: 'Observe', value: 'OBSERVE' },
                    { label: 'Auto', value: 'AUTO' },
                  ]}
                />
                <Form.Input
                  field="maxEntries"
                  label={t`History Retention (max entries)`}
                  type="number"
                />

                <div className="border-t pt-4">
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
                      onClick={() => {
                        const current = form.getValues('triggers') ?? [];
                        form.setValue('triggers', [...current, { type: 'Event', event: '' }], {
                          shouldDirty: true,
                        });
                      }}>
                      <Trans>Add Trigger</Trans>
                    </Button>
                  </div>

                  {(form.watch('triggers') ?? []).map((_: unknown, idx: number) => (
                    <div key={idx} className="mb-3 space-y-3 rounded-lg border p-4">
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
                          onClick={() => {
                            const current = form.getValues('triggers') ?? [];
                            form.setValue(
                              'triggers',
                              current.filter((_: unknown, i: number) => i !== idx),
                              { shouldDirty: true }
                            );
                          }}
                        />
                      </div>
                      <Row gutter={[16, 16]}>
                        <Col span={12}>
                          <Form.Select
                            field={`triggers.${idx}.type`}
                            label={t`Type`}
                            required
                            options={[
                              { label: 'Event', value: 'Event' },
                              { label: 'Manual', value: 'Manual' },
                            ]}
                          />
                        </Col>
                        <Col span={12}>
                          <Form.Select
                            field={`triggers.${idx}.event`}
                            label={t`Event`}
                            options={[{ label: 'UserCreated', value: 'UserCreated' }]}
                          />
                        </Col>
                      </Row>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
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
                      onClick={() => {
                        const current = form.getValues('stages');
                        form.setValue(
                          'stages',
                          [
                            ...current,
                            {
                              name: '',
                              providers: '',
                              thresholdReviewScore: 50,
                              thresholdDeactivateScore: 80,
                              required: false,
                              shortCircuitBelow: undefined,
                            },
                          ],
                          { shouldDirty: true }
                        );
                      }}>
                      <Trans>Add Stage</Trans>
                    </Button>
                  </div>

                  {stages.map((_: unknown, idx: number) => (
                    <div key={idx} className="mb-3 space-y-3 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <Text size="sm" weight="medium">
                          <Trans>Stage {idx + 1}</Trans>
                        </Text>
                        {stages.length > 1 && (
                          <Button
                            type="tertiary"
                            theme="borderless"
                            size="small"
                            icon={<XIcon size={14} />}
                            htmlType="button"
                            onClick={() => {
                              const current = form.getValues('stages');
                              form.setValue(
                                'stages',
                                current.filter((_: unknown, i: number) => i !== idx),
                                { shouldDirty: true }
                              );
                            }}
                          />
                        )}
                      </div>
                      <Form.Input field={`stages.${idx}.name`} label={t`Stage Name`} required />
                      <Form.Input
                        field={`stages.${idx}.providers`}
                        label={t`Providers (comma-separated)`}
                        required
                      />
                      <Row gutter={[16, 16]}>
                        <Col span={12}>
                          <Form.Input
                            field={`stages.${idx}.thresholdReviewScore`}
                            label={t`Review Threshold`}
                            type="number"
                          />
                        </Col>
                        <Col span={12}>
                          <Form.Input
                            field={`stages.${idx}.thresholdDeactivateScore`}
                            label={t`Deactivate Threshold`}
                            type="number"
                          />
                        </Col>
                      </Row>
                      <Row gutter={[16, 16]}>
                        <Col span={12}>
                          <Form.Checkbox field={`stages.${idx}.required`} label={t`Required`} />
                        </Col>
                        <Col span={12}>
                          <Form.Input
                            field={`stages.${idx}.shortCircuitBelow`}
                            label={t`Short-circuit Below`}
                            type="number"
                          />
                        </Col>
                      </Row>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="tertiary" theme="borderless" htmlType="button" onClick={onCancel}>
                    {t`Cancel`}
                  </Button>
                  <Button htmlType="submit" disabled={!form.formState.isDirty}>
                    {policy ? t`Update` : t`Create`}
                  </Button>
                </div>
              </>
            );
          }}
        </Form>
      </CardContent>
    </Card>
  );
}
