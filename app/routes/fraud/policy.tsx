import type { Route } from './+types/policy';
import { DialogConfirm } from '@/components/dialog';
import { PolicyDetail, PolicyForm } from '@/features/fraud';
import { useDeleteFraudPolicyMutation, useFraudPolicyListQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { AlertTriangle, PlusCircleIcon } from 'lucide-react';
import { useState } from 'react';

export const meta: Route.MetaFunction = () => metaObject(t`Fraud Policy`);

export default function Page() {
  const policyQuery = useFraudPolicyListQuery();
  const deletePolicyMutation = useDeleteFraudPolicyMutation();
  const policies = policyQuery.data?.items ?? [];
  const policy = policies[0];
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  if (policyQuery.isLoading) {
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex items-center justify-center py-12">
          <Text size="sm" textColor="muted">
            <Trans>Loading policy...</Trans>
          </Text>
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
          onSaved={async () => {
            setCreating(false);
          }}
        />
      );
    }

    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <AlertTriangle className="text-muted-foreground h-8 w-8" />
          <Text size="sm" textColor="muted">
            <Trans>No fraud policy configured.</Trans>
          </Text>
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
