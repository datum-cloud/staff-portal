import type { Route } from './+types/policy';
import { BadgeState } from '@/components/badge';
import { DialogConfirm } from '@/components/dialog';
import {
  fraudPolicyCreateMutation,
  fraudPolicyDeleteMutation,
  fraudPolicyUpdateMutation,
  useFraudPolicyListQuery,
  useFraudProviderListQuery,
} from '@/resources/request/client';
import type { FraudPolicy, FraudPolicySpec, Stage } from '@/resources/types/fraud.types';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Form } from '@datum-ui/form';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  AlertTriangle,
  ArrowRightLeft,
  Edit2Icon,
  Eye,
  Layers,
  PlusCircleIcon,
  Shield,
  Trash2Icon,
  XIcon,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Fraud Policy`);
};

// ─── Detail View ───

function StageCard({ stage, index }: { stage: Stage; index: number }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="bg-muted flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
              {index + 1}
            </span>
            {stage.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            {stage.required && <BadgeState state="info" message="Required" />}
            {stage.shortCircuit && (
              <BadgeState
                state="pending"
                message={`Short-circuit < ${stage.shortCircuit.skipWhenBelow}`}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
            <Trans>Providers</Trans>
          </h4>
          <div className="flex flex-wrap gap-2">
            {stage.providers.map((p) => (
              <BadgeState key={p.providerRef.name} state="info" message={p.providerRef.name} />
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
            <Trans>Thresholds</Trans>
          </h4>
          <div className="flex flex-wrap gap-2">
            {stage.thresholds
              .sort((a, b) => a.minScore - b.minScore)
              .map((th) => (
                <BadgeState
                  key={`${th.minScore}-${th.action}`}
                  state={th.action === 'DEACTIVATE' ? 'error' : 'warning'}
                  message={`>= ${th.minScore} → ${th.action}`}
                />
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PolicyDetail({
  policy,
  onEdit,
  onDelete,
}: {
  policy: FraudPolicy;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const conditions = policy.status?.conditions ?? [];
  const available = conditions.find((c) => c.type === 'Available');
  const degraded = conditions.find((c) => c.type === 'Degraded');

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {policy.metadata?.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="tertiary"
                theme="outline"
                icon={<Edit2Icon size={16} />}
                onClick={onEdit}>
                <Trans>Edit</Trans>
              </Button>
              <Button
                type="danger"
                theme="outline"
                icon={<Trash2Icon size={16} />}
                onClick={onDelete}>
                <Trans>Delete</Trans>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                <Trans>Enforcement Mode</Trans>
              </h4>
              <div className="flex items-center gap-2">
                {policy.spec.enforcement.mode === 'OBSERVE' ? (
                  <Eye className="text-muted-foreground h-4 w-4" />
                ) : (
                  <Zap className="h-4 w-4 text-yellow-500" />
                )}
                <BadgeState
                  state={policy.spec.enforcement.mode === 'OBSERVE' ? 'info' : 'warning'}
                  message={policy.spec.enforcement.mode}
                />
              </div>
            </div>
            <div>
              <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                <Trans>Stages</Trans>
              </h4>
              <div className="flex items-center gap-2">
                <Layers className="text-muted-foreground h-4 w-4" />
                <span className="text-sm font-medium">{policy.spec.stages.length}</span>
              </div>
            </div>
            <div>
              <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                <Trans>History Retention</Trans>
              </h4>
              <span className="text-sm font-medium">
                {policy.spec.historyRetention?.maxEntries ?? 50} entries
              </span>
            </div>
            <div>
              <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                <Trans>Status</Trans>
              </h4>
              <div className="flex items-center gap-2">
                {available && (
                  <BadgeState
                    state={available.status === 'True' ? 'active' : 'error'}
                    message={available.status === 'True' ? 'Available' : 'Unavailable'}
                  />
                )}
                {degraded?.status === 'True' && <BadgeState state="warning" message="Degraded" />}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Triggers */}
      {policy.spec.triggers && policy.spec.triggers.length > 0 && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              <Trans>Triggers</Trans>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {policy.spec.triggers.map((trigger, i) => (
                <BadgeState
                  key={i}
                  state="info"
                  message={trigger.type === 'Event' ? trigger.event ?? trigger.type : trigger.type}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Stages */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <ArrowRightLeft className="h-4 w-4" />
          <Trans>Evaluation Pipeline</Trans>
        </h3>
        <div className="space-y-3">
          {policy.spec.stages.map((stage, i) => (
            <StageCard key={stage.name} stage={stage} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Form ───

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
      thresholdReviewScore:
        s.thresholds.find((t) => t.action === 'REVIEW')?.minScore ?? 50,
      thresholdDeactivateScore:
        s.thresholds.find((t) => t.action === 'DEACTIVATE')?.minScore ?? 80,
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

function PolicyForm({
  policy,
  onCancel,
  onSaved,
}: {
  policy?: FraudPolicy;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const providerListQuery = useFraudProviderListQuery();
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
            providers: availableProviders.map((p) => p.metadata?.name).filter(Boolean).join(', '),
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
      await fraudPolicyUpdateMutation(policy.metadata?.name ?? '', spec);
      toast.success(t`Policy updated successfully`);
    } else {
      await fraudPolicyCreateMutation(values.name, spec);
      toast.success(t`Policy created successfully`);
    }
    onSaved();
  };

  return (
    <Card className="shadow-none">
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
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">
                      <Trans>Triggers</Trans>
                    </h4>
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
                    <div key={idx} className="border rounded-lg p-4 mb-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          <Trans>Trigger {idx + 1}</Trans>
                        </span>
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
                              { shouldDirty: true },
                            );
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Form.Select
                          field={`triggers.${idx}.type`}
                          label={t`Type`}
                          required
                          options={[
                            { label: 'Event', value: 'Event' },
                            { label: 'Manual', value: 'Manual' },
                          ]}
                        />
                        <Form.Select
                          field={`triggers.${idx}.event`}
                          label={t`Event`}
                          options={[{ label: 'UserCreated', value: 'UserCreated' }]}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">
                      <Trans>Pipeline Stages</Trans>
                    </h4>
                    <Button
                      type="tertiary"
                      theme="outline"
                      size="small"
                      icon={<PlusCircleIcon size={14} />}
                      htmlType="button"
                      onClick={() => {
                        const current = form.getValues('stages');
                        form.setValue('stages', [
                          ...current,
                          {
                            name: '',
                            providers: '',
                            thresholdReviewScore: 50,
                            thresholdDeactivateScore: 80,
                            required: false,
                            shortCircuitBelow: undefined,
                          },
                        ], { shouldDirty: true });
                      }}>
                      <Trans>Add Stage</Trans>
                    </Button>
                  </div>

                  {stages.map((_: unknown, idx: number) => (
                    <div key={idx} className="border rounded-lg p-4 mb-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          <Trans>Stage {idx + 1}</Trans>
                        </span>
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
                      <div className="grid grid-cols-2 gap-4">
                        <Form.Input
                          field={`stages.${idx}.thresholdReviewScore`}
                          label={t`Review Threshold`}
                          type="number"
                        />
                        <Form.Input
                          field={`stages.${idx}.thresholdDeactivateScore`}
                          label={t`Deactivate Threshold`}
                          type="number"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Form.Checkbox field={`stages.${idx}.required`} label={t`Required`} />
                        <Form.Input
                          field={`stages.${idx}.shortCircuitBelow`}
                          label={t`Short-circuit Below`}
                          type="number"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="tertiary"
                    theme="borderless"
                    htmlType="button"
                    onClick={onCancel}>
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

// ─── Page ───

export default function Page() {
  const policyQuery = useFraudPolicyListQuery();
  const policies = policyQuery.data?.items ?? [];
  const policy = policies[0];
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  if (policyQuery.isLoading) {
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex items-center justify-center py-12">
          <span className="text-muted-foreground text-sm">
            <Trans>Loading policy...</Trans>
          </span>
        </CardContent>
      </Card>
    );
  }

  // No policy — show create form or empty state
  if (!policy) {
    if (creating) {
      return (
        <PolicyForm
          onCancel={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            policyQuery.refetch();
          }}
        />
      );
    }

    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <AlertTriangle className="text-muted-foreground h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            <Trans>No fraud policy configured.</Trans>
          </p>
          <Button
            type="primary"
            icon={<PlusCircleIcon size={16} />}
            onClick={() => setCreating(true)}>
            <Trans>Create Policy</Trans>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Editing existing policy
  if (editing) {
    return (
      <PolicyForm
        policy={policy}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          policyQuery.refetch();
        }}
      />
    );
  }

  // Detail view
  return (
    <>
      <PolicyDetail
        policy={policy}
        onEdit={() => setEditing(true)}
        onDelete={() => setShowDelete(true)}
      />

      <DialogConfirm
        open={showDelete}
        onOpenChange={setShowDelete}
        title={t`Delete Policy`}
        description={t`Are you sure you want to delete the fraud policy "${policy.metadata?.name ?? ''}"? This will disable all fraud evaluation.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        requireConfirmation
        confirmationText="DELETE"
        onConfirm={async () => {
          await fraudPolicyDeleteMutation(policy.metadata?.name ?? '');
          toast.success(t`Policy deleted successfully`);
          policyQuery.refetch();
        }}
      />
    </>
  );
}
