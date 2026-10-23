import type { Route } from './+types/policy';
import { DialogConfirm } from '@/components/dialog';
import { PolicyDetail, PolicyDetailSkeleton, PolicyForm, useFraudViews } from '@/features/fraud';
import { SectionCard, SectionViewBar } from '@/features/milo';
import {
  useDeleteFraudPolicyMutation,
  useFraudPolicyListQuery,
  useFraudProviderListQuery,
} from '@/resources/request/client';
import { ACTION_ICONS, STATUS_ICONS } from '@/utils/config/icons.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useMemo, useState } from 'react';

export const handle = {
  breadcrumb: () => <Trans>Policy</Trans>,
};

export const meta: Route.MetaFunction = () => metaObject(t`Fraud Policy`);

export default function Page() {
  const views = useFraudViews();
  return (
    <>
      <SectionViewBar views={views} />
      <PolicyContent />
    </>
  );
}

function PolicyContent() {
  const policyQuery = useFraudPolicyListQuery();
  const deletePolicyMutation = useDeleteFraudPolicyMutation();
  const policies = policyQuery.data?.items ?? [];
  const policy = policies[0];

  // The stages reference FraudProvider resources by name; a provider being
  // unavailable is exactly what flips the policy to Degraded. Join the provider
  // list so each provider chip can show its live availability and link out.
  const providerListQuery = useFraudProviderListQuery();
  const providerAvailability = useMemo(() => {
    const map = new Map<string, boolean | undefined>();
    for (const p of providerListQuery.data?.items ?? []) {
      const name = p.metadata?.name;
      if (!name) continue;
      const available = p.status?.conditions?.find((c) => c.type === 'Available');
      map.set(name, available ? available.status === 'True' : undefined);
    }
    return map;
  }, [providerListQuery.data]);

  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  if (policyQuery.isLoading) {
    return <PolicyDetailSkeleton />;
  }

  // No policy — show create form or empty state
  if (!policy) {
    if (creating) {
      return (
        <PolicyForm
          onCancel={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
          }}
        />
      );
    }

    return (
      <SectionCard
        className="m-4"
        contentClassName="flex flex-col items-center justify-center gap-3 py-12">
        <STATUS_ICONS.warning className="text-muted-foreground h-8 w-8" />
        <Text size="sm" textColor="muted">
          <Trans>No fraud policy configured.</Trans>
        </Text>
        <Button
          type="primary"
          icon={<ACTION_ICONS.add size={16} />}
          onClick={() => setCreating(true)}>
          <Trans>Create Policy</Trans>
        </Button>
      </SectionCard>
    );
  }

  // Editing existing policy
  if (editing) {
    return (
      <PolicyForm
        policy={policy}
        onCancel={() => setEditing(false)}
        onSaved={async () => {
          setEditing(false);
        }}
      />
    );
  }

  // Detail view
  return (
    <>
      <PolicyDetail
        policy={policy}
        providerAvailability={providerAvailability}
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
          await deletePolicyMutation.mutateAsync(policy.metadata?.name ?? '');
          toast.success(t`Policy deleted successfully`);
        }}
      />
    </>
  );
}
