import { DialogConfirm } from '@/components/dialog';
import {
  useBillingDefaultOfferQuery,
  useSetBillingDefaultOfferMutation,
} from '@/resources/request/client';
import { Button } from '@datum-cloud/datum-ui/button';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { toast } from '@datum-cloud/datum-ui/toast';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';

export function useDefaultOfferControl(offerName: string) {
  const defaultOfferQuery = useBillingDefaultOfferQuery();
  const setDefaultMutation = useSetBillingDefaultOfferMutation();

  const currentDefault = defaultOfferQuery.data ?? '';
  const isDefault = currentDefault === offerName;

  const setDefault = (migrateFromPrevious?: boolean) =>
    setDefaultMutation.mutateAsync({
      offerName,
      migrateFromOffer: migrateFromPrevious && currentDefault ? currentDefault : null,
    });

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
  const [migrateAccounts, setMigrateAccounts] = useState(false);
  const { currentDefault, isDefault, isLoading, setDefault } = useDefaultOfferControl(offerName);
  const canMigrate = currentDefault.length > 0;

  if (isLoading || isDefault || !canSetAsDefault) {
    return null;
  }

  return (
    <>
      <Button
        type="secondary"
        theme="outline"
        onClick={() => {
          setMigrateAccounts(false);
          setConfirmOpen(true);
        }}>
        <Trans>Set as default</Trans>
      </Button>
      <DialogConfirm
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setMigrateAccounts(false);
          }
          setConfirmOpen(open);
        }}
        title={t`Set platform default`}
        description={t`Set "${offerName}" as the platform default Offer? New billing accounts and existing accounts with no BillingEntitlement are entitled automatically.`}
        confirmText={t`Set as default`}
        cancelText={t`Cancel`}
        onConfirm={async () => {
          try {
            await setDefault(migrateAccounts);
            toast.success(
              migrateAccounts
                ? t`Default Offer updated; accounts on the previous default will be migrated`
                : t`Default Offer updated`
            );
          } catch (err) {
            toast.error(err instanceof Error ? err.message : t`Failed to set default Offer`);
            throw err;
          }
        }}>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            className="mt-0.5"
            checked={migrateAccounts}
            disabled={!canMigrate}
            onCheckedChange={(next) => setMigrateAccounts(next === true)}
          />
          <span>
            {canMigrate
              ? t`Also move accounts currently on "${currentDefault}" to this Offer`
              : t`Also move accounts currently on the previous default to this Offer`}
          </span>
        </label>
      </DialogConfirm>
    </>
  );
}
