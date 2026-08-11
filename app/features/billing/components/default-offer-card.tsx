import { DialogConfirm } from '@/components/dialog';
import {
  useBillingDefaultOfferQuery,
  useSetBillingDefaultOfferMutation,
} from '@/resources/request/client';
import { Button } from '@datum-cloud/datum-ui/button';
import { toast } from '@datum-cloud/datum-ui/toast';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';

export function useDefaultOfferControl(offerName: string) {
  const defaultOfferQuery = useBillingDefaultOfferQuery();
  const setDefaultMutation = useSetBillingDefaultOfferMutation();

  const currentDefault = defaultOfferQuery.data ?? '';
  const isDefault = currentDefault === offerName;

  const setDefault = () => setDefaultMutation.mutateAsync(offerName);

  return {
    currentDefault,
    isDefault,
    isLoading: defaultOfferQuery.isLoading,
    isError: defaultOfferQuery.isError,
    isPending: setDefaultMutation.isPending,
    setDefault,
  };
}

type DefaultOfferHeaderActionsProps = {
  offerName: string;
  canSetAsDefault: boolean;
};

/** Compact header action — only when this Offer can replace the platform default. */
export function DefaultOfferHeaderActions({
  offerName,
  canSetAsDefault,
}: DefaultOfferHeaderActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { isDefault, isLoading, setDefault } = useDefaultOfferControl(offerName);

  if (isLoading || isDefault || !canSetAsDefault) {
    return null;
  }

  return (
    <>
      <Button type="secondary" theme="outline" onClick={() => setConfirmOpen(true)}>
        <Trans>Set as default</Trans>
      </Button>
      <DialogConfirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t`Set platform default`}
        description={t`Set "${offerName}" as the platform default Offer? New billing accounts and existing accounts with no BillingEntitlement are entitled automatically. Accounts that already have a BillingEntitlement are not migrated.`}
        confirmText={t`Set as default`}
        cancelText={t`Cancel`}
        onConfirm={async () => {
          try {
            await setDefault();
            toast.success(t`Default Offer updated`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : t`Failed to set default Offer`);
            throw err;
          }
        }}
      />
    </>
  );
}
